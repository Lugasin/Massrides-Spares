import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

console.log("Vesicash Webhook Handler Started");

serve(async (req) => {
  try {
    // 1. Verify Secret (Optional but recommended security step)
    // Vesicash sends a signature or you can check a custom header if configured.
    // For now, we will trust the payload but log it for inspection.

    const payload = await req.json();
    console.log("Webhook Payload Received:", JSON.stringify(payload));

    // 2. Parse the Event
    // Vesicash structure usually has: { event: 'payment.successful', data: { ... } }
    const eventType = payload.event || payload.type;
    const data = payload.data;

    // Log even ignored events for debugging
    if (eventType !== 'payment.successful' && eventType !== 'transaction.successful') {
        console.log(`Event ignored: ${eventType}`);
        return new Response('Event ignored', { status: 200 });
    }

    // 3. Setup Supabase Admin Client
    // We use the Service Role Key because this function runs in the background, not by a user.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 4. Extract Order ID
    // We sent "order_id" in the metadata during checkout. Vesicash sends it back here.
    const orderId = data.metadata?.order_id;
    const paymentReference = data.reference;

    if (!orderId) {
        throw new Error("No Order ID found in webhook metadata");
    }

    // 5. Update Payment and Order Status in Database
    const { data: payment, error: pError } = await supabaseAdmin
      .from('payments')
      .update({ status: 'paid' })
      .eq('vesicash_transaction_id', paymentReference)
      .select()
      .single();

    if (pError || !payment) {
        throw new Error(`Failed to update payment status for reference: ${paymentReference}`);
    }

    const { error: oError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', payment.order_id);

    if (oError) {
        console.error("Failed to update order status:", oError);
        throw oError;
    }

    console.log(`Order ${orderId} marked as PAID via Webhook.`);

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    console.error("Webhook Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
});
