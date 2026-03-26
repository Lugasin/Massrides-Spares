import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

console.log("Vesicash Webhook Handler Started");

function normalisePaymentStatus(eventType: string, providerStatus?: string | null) {
  const status = `${providerStatus ?? ""}`.toLowerCase();
  const event = `${eventType}`.toLowerCase();

  if (event.includes("success") || status === "success" || status === "successful" || status === "paid") {
    return "paid";
  }

  if (event.includes("fail") || status === "failed") {
    return "failed";
  }

  if (event.includes("cancel") || status === "cancelled") {
    return "cancelled";
  }

  if (event.includes("author") || status === "authorised" || status === "authorized") {
    return "authorised";
  }

  return "pending";
}

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
    const data = payload.data || {};

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const paymentReference = data.reference || data.tx_ref || data.transaction_reference;
    const normalisedStatus = normalisePaymentStatus(eventType, data.status);
    const completedAt = normalisedStatus === "paid" ? new Date().toISOString() : null;

    if (!paymentReference) {
        throw new Error("No payment reference found in webhook payload");
    }

    const { data: payment, error: pError } = await supabaseAdmin
      .from('payments')
      .update({
        status: normalisedStatus,
        completed_at: completedAt,
        vesicash_payment_id: data.payment_id ?? null,
      })
      .eq('vesicash_transaction_id', paymentReference)
      .select()
      .single();

    if (pError || !payment) {
        throw new Error(`Failed to update payment status for reference: ${paymentReference}`);
    }

    const { error: oError } = await supabaseAdmin
      .from('orders')
      .update({
        status: normalisedStatus === 'paid' ? 'processing' : normalisedStatus === 'cancelled' ? 'cancelled' : 'pending',
        payment_status: normalisedStatus,
      })
      .eq('id', payment.order_id);

    if (oError) {
        console.error("Failed to update order status:", oError);
        throw oError;
    }

    await supabaseAdmin.from('financial_audit_logs').insert({
      event_type: `payment_${normalisedStatus}`,
      entity_type: 'payment',
      entity_id: String(payment.id),
      amount: Number(data.amount ?? 0) || null,
      metadata: {
        order_id: payment.order_id,
        provider: 'vesicash',
        reference: paymentReference,
        provider_status: data.status ?? null,
        event_type: eventType,
        payload,
      },
    });

    console.log(`Order ${payment.order_id} updated to ${normalisedStatus} via webhook.`);

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err: any) {
    console.error("Webhook Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 400 });
  }
});
