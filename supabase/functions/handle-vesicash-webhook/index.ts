import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";
import { loadVesicashConfig } from "../_shared/vesicash.ts";

console.log("Vesicash Webhook Handler Started");

const jsonHeaders = { "Content-Type": "application/json" };

type PaymentStatus = "pending" | "processing" | "authorised" | "paid" | "failed" | "cancelled" | "refunded";

function asObject(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function normalisePaymentStatus(eventType: string, providerStatus?: string | null): PaymentStatus {
  const status = `${providerStatus ?? ""}`.toLowerCase();
  const event = `${eventType}`.toLowerCase();

  if (event.includes("refund") || status === "refunded") return "refunded";
  if (event.includes("success") || status === "success" || status === "successful" || status === "paid") return "paid";
  if (event.includes("process") || status === "processing") return "processing";
  if (event.includes("fail") || event.includes("declin") || status === "failed") return "failed";
  if (event.includes("cancel") || status === "cancelled") return "cancelled";
  if (event.includes("author") || status === "authorised") return "authorised";

  return "pending";
}

function resolvePaymentReference(payload: Record<string, unknown>, data: Record<string, unknown>) {
  return String(
    data.reference ??
      data.tx_ref ??
      data.transaction_reference ??
      data.payment_reference ??
      payload.reference ??
      "",
  ).trim();
}

function verifyMorSignature(body: string, secret: string, signature: string, timestamp: string | null) {
  if (!timestamp) return false;
  const signedPayload = `${timestamp}.${body}`;
  const digest = createHmac("sha256", secret).update(signedPayload).digest("hex");
  return digest.toLowerCase() === signature.trim().toLowerCase();
}

serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: jsonHeaders });
    }

    const vesicash = await loadVesicashConfig(supabaseAdmin);
    const morSignature = req.headers.get("mor-signature");
    const timestamp = req.headers.get("mor-timestamp");
    const body = await req.text();

    if (!vesicash.webhookSecret) throw new Error("Missing VESICASH_WEBHOOK_SECRET.");

    if (morSignature && !verifyMorSignature(body, vesicash.webhookSecret, morSignature, timestamp)) {
        throw new Error("Invalid webhook signature.");
    }

    const payload = JSON.parse(body);
    const eventType = String(payload.event || payload.type || "unknown");
    const data = asObject(payload.data);

    const paymentReference = resolvePaymentReference(payload, data);
    if (!paymentReference) throw new Error("No payment reference found.");

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("vesicash_transaction_id", paymentReference)
      .maybeSingle();

    if (!payment) throw new Error(`Payment not found: ${paymentReference}`);

    const nextStatus = normalisePaymentStatus(eventType, String(data.status ?? ""));

    await supabaseAdmin
      .from("payments")
      .update({
        status: nextStatus,
        completed_at: nextStatus === "paid" ? new Date().toISOString() : null,
        vesicash_payment_id: String(data.payment_id || payment.vesicash_payment_id || "")
      })
      .eq("id", payment.id);

    await supabaseAdmin
      .from("orders")
      .update({
        payment_status: nextStatus,
        status: nextStatus === "paid" ? "processing" : "pending"
      })
      .eq("id", payment.order_id);

    return new Response(JSON.stringify({ received: true, status: nextStatus }), { status: 200, headers: jsonHeaders });
  } catch (err) {
    console.error("Webhook Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: jsonHeaders });
  }
});
