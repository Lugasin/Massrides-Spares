import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

console.log("Vesicash Webhook Handler Started");

serve(async (req) => {
  try {
    const signature = req.headers.get("x-vesicash-signature");
    const webhookSecret = Deno.env.get("VESICASH_WEBHOOK_SECRET");

    if (!signature || !webhookSecret) {
      throw new Error("Missing signature or secret for webhook verification.");
    }

    const body = await req.text();
    const hash = createHmac("sha512", webhookSecret)
      .update(body)
      .digest("hex");

    if (hash !== signature) {
      throw new Error("Invalid webhook signature.");
    }

    const payload = JSON.parse(body);
    console.log("Webhook Payload Received and Verified:", JSON.stringify(payload));

    const eventType = payload.event || payload.type;
    const data = payload.data;

    if (eventType !== 'payment.successful' && eventType !== 'transaction.successful') {
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
