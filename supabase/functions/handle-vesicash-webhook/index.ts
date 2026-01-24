import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

console.log("Vesicash Webhook Handler Started");

serve(async (req) => {
  try {
    const payload = await req.json();
    console.log("Webhook Payload Received:", JSON.stringify(payload));

    const eventType = payload.event || payload.type;
    const data = payload.data;

    if (eventType !== 'payment.success' && eventType !== 'transaction.successful') {
        console.log(`Event ignored: ${eventType}`);
        return new Response('Event ignored', { status: 200 });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const paymentReference = data.reference;

    if (!paymentReference) {
        throw new Error("No payment reference found in webhook payload");
    }

    // 1. Find the payment record
    const { data: payment, error: pError } = await supabaseAdmin
      .from('payments')
      .select('id, order_id')
      .eq('vesicash_transaction_id', paymentReference)
      .single();

    if (pError || !payment) {
      console.error("Payment not found for ref:", paymentReference);
      return new Response(JSON.stringify({ error: "Payment not found" }), { status: 404 });
    }

    // 2. Update Payment Status
    await supabaseAdmin
      .from('payments')
      .update({ status: 'paid' })
      .eq('id', payment.id);

    // 3. Update Order Status
    const { error } = await supabaseAdmin
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', payment.order_id);

    if (error) {
        console.error("Failed to update order:", error);
        throw error;
    }

    console.log(`Order ${payment.order_id} marked as PAID via Webhook.`);

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    console.error("Webhook Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
});
