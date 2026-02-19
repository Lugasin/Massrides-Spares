import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

// LEGACY_ALIAS_OK: retained only for backward compatibility while clients migrate to /handle-vesicash-webhook.

serve(async (req) => {
  try {
    const signature = req.headers.get("x-vesicash-signature");
    const webhookSecret = Deno.env.get("VESICASH_WEBHOOK_SECRET");

    if (!signature || !webhookSecret) {
      throw new Error("Missing signature or webhook secret");
    }

    const body = await req.text();
    const hash = createHmac("sha512", webhookSecret).update(body).digest("hex");

    if (hash !== signature) {
      throw new Error("Invalid webhook signature");
    }

    const payload = JSON.parse(body);
    const eventType = payload.event || payload.type;
    const data = payload.data ?? {};

    if (eventType !== 'payment.successful' && eventType !== 'transaction.successful') {
      return new Response('Event ignored', { status: 200 });
    }

    const paymentReference = data.reference;
    if (!paymentReference) {
      throw new Error("No payment reference found in webhook payload");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('vesicash_transaction_id', paymentReference)
      .select('*')
      .single();

    if (paymentError || !payment) {
      throw new Error(`Failed to update payment status for reference: ${paymentReference}`);
    }

    const { error: orderError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'paid', payment_status: 'paid', updated_at: new Date().toISOString() })
      .eq('id', payment.order_id);

    if (orderError) throw orderError;

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 400 });
  }
});
