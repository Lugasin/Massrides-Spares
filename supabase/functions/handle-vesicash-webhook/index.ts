import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

/**
 * Vesicash Webhook Handler
 * 
 * Handles full payment lifecycle:
 * - payment.initiated -> initiated
 * - payment.processing -> processing  
 * - payment.successful / transaction.successful -> paid
 * - payment.failed -> failed
 * - payment.cancelled -> cancelled
 */

console.log("Vesicash Webhook Handler Started");

serve(async (req) => {
  try {
    // ==========================================
    // 1. Verify Webhook Signature
    // ==========================================
    
    const signature = req.headers.get("x-vesicash-signature");
    const webhookSecret = Deno.env.get("VESICASH_WEBHOOK_SECRET");

    const body = await req.text();
    
    if (signature && webhookSecret) {
      const hash = createHmac("sha512", webhookSecret)
        .update(body)
        .digest("hex");

      if (hash !== signature) {
        console.error("Invalid webhook signature");
        throw new Error("Invalid webhook signature.");
      }
      console.log("Webhook signature verified");
    } else {
      console.warn("Webhook signature verification skipped (no secret or signature)");
    }

    // ==========================================
    // 2. Parse Payload
    // ==========================================
    
    const payload = JSON.parse(body);
    console.log("Webhook Payload Received:", JSON.stringify(payload, null, 2));

    const eventType = payload.event || payload.type;
    const data = payload.data || payload;

    // ==========================================
    // 3. Map Event to Status
    // ==========================================
    
    let newPaymentStatus: string | null = null;
    let newOrderStatus: string | null = null;

    switch (eventType) {
      case 'payment.initiated':
      case 'payment.pending':
        newPaymentStatus = 'PROCESSING'; // MANDATORY: pending -> PROCESSING
        break;
      case 'payment.processing':
        newPaymentStatus = 'PROCESSING';
        break;
      case 'payment.successful':
      case 'transaction.successful':
        newPaymentStatus = 'PAID'; // MANDATORY: successful -> PAID
        newOrderStatus = 'PAID';
        break;
      case 'payment.failed':
      case 'transaction.failed':
        newPaymentStatus = 'FAILED'; // MANDATORY: failed -> FAILED
        break;
      case 'payment.cancelled':
      case 'transaction.cancelled':
        newPaymentStatus = 'EXPIRED'; // Using EXPIRED for cancelled as per close enough mapping or FAILED. 
        // User map: expired -> EXPIRED. 
        // I will map cancelled to FAILED or EXPIRED? User didn't map cancelled explicitly in small table but listed EXPIRED. I'll stick to FAILED or stick to EXPIRED if explicitly cancelled.
        // Let's us FAILED for safety or EXPIRED if it matches semantic.
        newPaymentStatus = 'FAILED'; 
        newOrderStatus = 'CANCELLED';
        break;
      case 'payment.expired':
        newPaymentStatus = 'EXPIRED'; // MANDATORY: expired -> EXPIRED
        break;
      default:
        console.log(`Event ignored: ${eventType}`);
        return new Response(JSON.stringify({ received: true, ignored: true }), { 
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
    }

    // ==========================================
    // 4. Get Payment Reference
    // ==========================================
    
    const paymentReference = data.reference || data.payment_reference || data.transaction_reference;

    if (!paymentReference) {
      console.error("No payment reference found in payload");
      throw new Error("No payment reference found in webhook payload");
    }

    console.log(`Processing ${eventType} for reference: ${paymentReference}`);

    // ==========================================
    // 5. Update Database
    // ==========================================
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find payment by reference (check both columns for compatibility)
    const { data: payment, error: pFindError } = await supabaseAdmin
      .from('payments')
      .select('*')
      .or(`provider_reference.eq.${paymentReference},vesicash_transaction_id.eq.${paymentReference}`)
      .single();

    if (pFindError || !payment) {
      console.error("Payment not found:", pFindError);
      throw new Error(`Payment not found for reference: ${paymentReference}`);
    }

    console.log(`Found payment ID: ${payment.id}, Order ID: ${payment.order_id}`);

    // Update payment status
    const { error: pUpdateError } = await supabaseAdmin
      .from('payments')
      .update({ 
        status: newPaymentStatus,
        raw_payload: payload,
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.id);

    if (pUpdateError) {
      console.error("Failed to update payment status:", pUpdateError);
      throw new Error(`Failed to update payment status: ${pUpdateError.message}`);
    }

    // Update order status if applicable
    if (newOrderStatus) {
      const { error: oError } = await supabaseAdmin
        .from('orders')
        .update({ status: newOrderStatus })
        .eq('id', payment.order_id);

      if (oError) {
        console.error("Failed to update order status:", oError);
        // Non-fatal, continue
      }

      // Update vendor orders status
      await supabaseAdmin
        .from('vendor_orders')
        .update({ status: newOrderStatus })
        .eq('order_id', payment.order_id);
    }

    console.log(`Payment ${payment.id} updated to: ${newPaymentStatus}`);
    if (newOrderStatus) {
      console.log(`Order ${payment.order_id} updated to: ${newOrderStatus}`);
    }

    // ==========================================
    // 6. Log Activity
    // ==========================================
    
    // Get order to find user_id
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('user_id, guest_email')
      .eq('id', payment.order_id)
      .single();

    await supabaseAdmin.from('activity_logs').insert({
      user_id: order?.user_id || null,
      action: `PAYMENT_${newPaymentStatus?.toUpperCase()}`,
      metadata: {
        payment_id: payment.id,
        order_id: payment.order_id,
        reference: paymentReference,
        event_type: eventType,
        guest_email: order?.guest_email
      }
    });

    // ==========================================
    // 7. Send Notification & Email (if successful)
    // ==========================================
    
    if (newPaymentStatus === 'paid') {
      // 7.1 Send In-App Notification
      if (order?.user_id) {
        await supabaseAdmin.from('notifications').insert({
          user_id: order.user_id,
          title: 'Payment Successful',
          message: `Your payment for order #${payment.order_id} has been confirmed.`,
          type: 'success'
        });
      }

      // 7.2 Fetch Order Details for Email
      const { data: fullOrder, error: oFetchError } = await supabaseAdmin
        .from('orders')
        .select(`
          *,
          order_items(
            quantity,
            price,
            spare_part:spare_parts(name)
          )
        `)
        .eq('id', payment.order_id)
        .single();

      if (!oFetchError && fullOrder) {
        const recipientEmail = fullOrder.customer_email || fullOrder.guest_email || fullOrder.shipping_address?.email;
        
        if (recipientEmail) {
          console.log(`Triggering digital receipt email to: ${recipientEmail}`);
          
          const items = (fullOrder.order_items || []).map((item: any) => ({
            name: item.spare_part?.name || 'Spare Part',
            quantity: item.quantity,
            price: item.price
          }));

          // Call send-email Edge Function
          const { error: emailError } = await supabaseAdmin.functions.invoke('send-email', {
            body: {
              to: recipientEmail,
              type: 'payment_receipt',
              order_id: fullOrder.id,
              data: {
                order_id: fullOrder.id,
                order_number: fullOrder.id, // Using ID as number if none exists
                amount: fullOrder.total_amount,
                currency: 'ZMW',
                reference: paymentReference,
                receipt_id: `${fullOrder.id}-${paymentReference.slice(0, 4)}`.toUpperCase(),
                method: data.payment_method || 'Vesicash',
                items: items
              }
            }
          });

          if (emailError) {
            console.error("Failed to trigger email receipt:", emailError);
          } else {
            console.log("Digital receipt email triggered successfully");
          }
        }
      }
    }

    // ==========================================
    // Return Success
    // ==========================================
    
    return new Response(JSON.stringify({ 
      received: true,
      payment_id: payment.id,
      new_status: newPaymentStatus
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    console.error("Webhook Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 400,
      headers: { "Content-Type": "application/json" }
    });
  }
});
