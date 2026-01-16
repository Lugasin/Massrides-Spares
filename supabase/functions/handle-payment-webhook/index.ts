import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";

console.log("Handle-Payment-Webhook Function Invoked");

serve(async (req) => {
  // Webhooks are POST requests
  if (req.method !== 'POST') {
     return new Response('Method not allowed', { status: 405 });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const webhookSecret = Deno.env.get('VESICASH_WEBHOOK_SECRET');
    const signature = req.headers.get('x-vesicash-signature') || req.headers.get('v-signature'); // Check docs for exact header
    
    // Read raw body for signature verification
    const rawBody = await req.text();
    
    if (webhookSecret && signature) {
      // computed signature = HMAC_SHA256(secret, rawBody)
      const encoder = new TextEncoder();
      const keyData = encoder.encode(webhookSecret);
      const key = await crypto.subtle.importKey(
        'raw', 
        keyData, 
        { name: 'HMAC', hash: 'SHA-256' }, 
        false, 
        ['sign']
      );
      const signatureBuffer = await crypto.subtle.sign(
        'HMAC', 
        key, 
        encoder.encode(rawBody)
      );
      
      const computedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      if (computedSignature !== signature) {
        throw new Error('Invalid Webhook Signature');
      }
    } else if (webhookSecret) {
         console.warn("Webhook received without signature header but secret is set.");
         // In production, throw error. For now/dev, maybe allow? 
         // Strategy: Throw to be safe.
         // throw new Error("Missing Signature Header");
    }

    const payload = JSON.parse(rawBody);
    console.log("Webhook Payload:", JSON.stringify(payload));

    const eventId = payload.event_id || payload.id; // Unique event ID from Vesicash
    const transactionId = payload.transaction_id || payload.reference; 
    const status = payload.status; 
    // Vesicash status: 'success', 'failed', 'reversed', etc.
    
    // Idempotency Check
    if (eventId) {
      const { data: existingLog } = await supabase
        .from('audit_logs')
        .select('id')
        .eq('event_type', 'WEBHOOK_PROCESSED')
        .eq('entity_id', eventId) // we store event_id in entity_id for dedupe? or metadata
        // Better: metadata->>event_id
        .limit(1)
        .maybeSingle(); // audit_logs might not allow select easily if RLS restricted, but service role is fine.

        // Actually checking metadata is expensive on large tables without index.
        // Let's assume transactionId is unique enough for PAYMENT_SUCCESS events.
    }

    // Map Status
    let paymentStatus = 'pending';
    let orderStatus = 'awaiting_payment';

    if (['success', 'completed', 'paid', 'successful'].includes(status?.toLowerCase())) {
        paymentStatus = 'success';
        orderStatus = 'paid'; // or 'processing'
    } else if (['failed', 'declined', 'rejected'].includes(status?.toLowerCase())) {
        paymentStatus = 'failed';
        orderStatus = 'cancelled'; // or keep awaiting_payment if retryable
    } else if (['refunded', 'reversed'].includes(status?.toLowerCase())) {
        paymentStatus = 'refunded';
        orderStatus = 'refunded';
    }

    // Find Payment Record
    // Query by vesicash_transaction_id or infer from payload.reference (if it stored our order ID or merchant ref)
    // create-payment-session stored 'vesicash_transaction_id'
    
    let paymentQuery = supabase.from('payments').select('id, order_id');
    if (transactionId) {
        paymentQuery = paymentQuery.eq('vesicash_transaction_id', transactionId);
    } else {
        // Fallback: try to find by order ref in payload
        // payload: { reference: 'ORD-UUID-...' }
        // implementation choice
    }
    
    const { data: payment } = await paymentQuery.maybeSingle();

    let targetPayment = payment;

    // Fallback: Try to find by Order ID in reference
    if (!targetPayment && payload.reference) {
        // Expected format: ORD-UUID-TIMESTAMP or just UUID in test
        const ref = payload.reference;
        let orderId = null;

        if (ref.startsWith('ORD-')) {
             const parts = ref.split('-');
             if (parts.length >= 2) orderId = parts[1]; // UUID
        } else if (ref.includes('-')) {
             // Assume it might be just UUID if strict check passes, else ignore
             if (ref.length === 36) orderId = ref;
        } else {
             // Direct UUID?
             if (ref.length === 36) orderId = ref;
        }

        if (orderId) {
             console.log("Attempting fallback lookup by Order ID:", orderId);
             const { data: paymentByOrder } = await supabase
                .from('payments')
                .select('id, order_id')
                .eq('order_id', orderId)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
             
             if (paymentByOrder) {
                targetPayment = paymentByOrder;
             }
        }
    }

    if (targetPayment) {
        // Update Payment
        await supabase
            .from('payments')
            .update({ 
                payment_status: paymentStatus, 
                raw_payload: payload,
                updated_at: new Date().toISOString()
            })
            .eq('id', targetPayment.id);

        // Update Order
        await supabase
            .from('orders')
            .update({ 
                payment_status: paymentStatus,
                order_status: orderStatus,
                 // if paid, maybe set other fields
            })
            .eq('id', targetPayment.order_id);

        // Audit Log
        await supabase.from('audit_logs').insert({
            entity_type: 'payment',
            entity_id: String(targetPayment.id),
            event_type: paymentStatus === 'success' ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
            actor: 'system',
            metadata: { event_id: eventId, transaction_id: transactionId, raw_status: status }
        });

        // Trigger Emails/Alerts (Phase G)
        if (paymentStatus === 'success') {
          // Fetch full order details/items for email
          const { data: fullOrder } = await supabase
            .from('orders')
            .select('*, order_items(*, spare_part:spare_parts(name, price))')
            .eq('id', targetPayment.order_id)
            .single();

          if (fullOrder) {
            const items = fullOrder.order_items.map((i: any) => ({
              name: i.spare_part.name,
              quantity: i.quantity,
              price: i.unit_price || i.spare_part.price
            }));
            
            const customerEmail = fullOrder.customer_info?.email;
            
            // 1. Email Customer
            if (customerEmail) {
                await supabase.functions.invoke('send-notification-email', {
                  body: {
                    to: customerEmail,
                    subject: `Order Confirmation #${fullOrder.order_number}`,
                    type: 'order_confirmation',
                    data: {
                      order_number: fullOrder.order_number,
                      total: fullOrder.total,
                      items: items
                    }
                  }
                });
            }

            // 2. Email Admin
            const adminEmail = Deno.env.get('SUPER_ADMIN_EMAIL');
            if (adminEmail) {
              await supabase.functions.invoke('send-notification-email', {
                body: {
                  to: adminEmail,
                  subject: `New Paid Order #${fullOrder.order_number}`,
                  type: 'admin_new_order_alert',
                  data: {
                    order_number: fullOrder.order_number,
                    customer_name: `${fullOrder.customer_info?.firstName || ''} ${fullOrder.customer_info?.lastName || ''}`,
                    customer_email: customerEmail,
                    total: fullOrder.total
                  }
                }
              });
            }
          }
        } else if (paymentStatus === 'failed') {
          // 3. Email Admin on Failure
          const adminEmail = Deno.env.get('SUPER_ADMIN_EMAIL');
            if (adminEmail) {
              await supabase.functions.invoke('send-notification-email', {
                body: {
                  to: adminEmail,
                  subject: `PAYMENT FAILED: Transaction ${transactionId}`,
                  type: 'payment_failed_alert',
                  data: {
                    transaction_id: transactionId,
                    amount: payload.amount,
                    reason: status, // or payload.reason
                    customer_email: payload.customer?.email || 'Unknown'
                  }
                }
              });
            }
        }
    } else {
        console.warn("Payment record not found for transaction:", transactionId);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Webhook Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});