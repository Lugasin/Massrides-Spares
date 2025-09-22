// tj-webhook/index.ts
import { serve } from "std/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TJ_WEBHOOK_SECRET = Deno.env.get("TJ_WEBHOOK_SECRET")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { fetch });

async function computeHmacHex(message: string, secret: string) {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  const arr = Array.from(new Uint8Array(sig));
  return arr.map(b => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string | null, b: string | null) {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    const raw = await req.text();
    const signature = req.headers.get("x-tj-signature") || "";

    const computed = await computeHmacHex(raw, TJ_WEBHOOK_SECRET);
    if (!timingSafeEqual(computed, signature)) {
      console.warn("Invalid signature: computed", computed, "header", signature);
      return new Response("invalid signature", { status: 400 });
    }

    const payload = JSON.parse(raw);

    await supabase.from("webhooks_log").insert([{ provider: "tj", event_type: payload.event || payload.type || "unknown", payload, received_at: new Date().toISOString() }]);

    const sessionId = payload.data?.session_id || payload.data?.provider_session_id || payload.data?.reference || payload.data?.order_reference;
    const paymentId = payload.data?.payment_id || payload.data?.id;

    let { data: payments } = await supabase.from("payments").select("*").or(`provider_session_id.eq.${sessionId},provider_payment_id.eq.${paymentId}`).limit(1);

    if (!payments || payments.length === 0) {
      const orderRef = payload.data?.order_reference || payload.data?.metadata?.order_reference;
      if (orderRef) {
        const { data: order } = await supabase.from("orders").select("*").eq("order_reference", orderRef).limit(1).single();
        if (order) {
          const { data: payments2 } = await supabase.from("payments").select("*").eq("order_id", order.id).limit(1);
          payments = payments2;
        }
      }
    }

    if (!payments || payments.length === 0) {
      console.warn("No payment match for webhook", payload);
      return new Response("no payment found", { status: 404 });
    }

    const payment = payments[0];
    const tjStatus = payload.data?.status || payload.status || payload.event;
    let localStatus = "initiated";
    if (["success", "succeeded", "paid", "completed"].includes(String(tjStatus).toLowerCase())) localStatus = "succeeded";
    if (["failed", "declined", "cancelled"].includes(String(tjStatus).toLowerCase())) localStatus = "failed";

    await supabase.from("payments").update({ status: localStatus, provider_payment_id: paymentId || payment.provider_payment_id, raw_payload: payload, updated_at: new Date().toISOString() }).eq("id", payment.id);

    const orderStatus = localStatus === "succeeded" ? "paid" : (localStatus === "failed" ? "failed" : "pending");
    await supabase.from("orders").update({ status: orderStatus, payment_provider_ref: paymentId }).eq("id", payment.order_id);

    if (localStatus === "succeeded") {
      const { data: items } = await supabase.from("order_items").select("*").eq("order_id", payment.order_id);
      const { data: order } = await supabase.from("orders").select("*").eq("id", payment.order_id).single();
      for (const item of items || []) {
        await supabase.rpc('commit_inventory_for_product', { p_product_id: item.product_id, p_vendor_id: order.vendor_id, p_qty: item.quantity });
      }
    } else if (localStatus === "failed") {
      await supabase.rpc('release_inventory_for_order', { o_id: payment.order_id });
    }

    const { data: order } = await supabase.from("orders").select("*").eq("id", payment.order_id).single();
    if (order) {
      const notifs: any[] = [];
      if (order.user_id) notifs.push({ user_id: order.user_id, type: "payment", title: "Payment update", message: `Payment ${orderStatus} for order ${order.order_reference}`, data: payload, created_at: new Date().toISOString() });
      if (order.vendor_id) {
        const { data: vendor } = await supabase.from("vendors").select("*").eq("id", order.vendor_id).limit(1).single();
        if (vendor && vendor.owner_id) notifs.push({ user_id: vendor.owner_id, type: "vendor_payment", title: "Order payment", message: `Order ${order.order_reference} is ${orderStatus}`, data: payload, created_at: new Date().toISOString() });
      }
      if (notifs.length) await supabase.from("notifications").insert(notifs);
    }

    return new Response("ok", { status: 200 });

  } catch (err) {
    console.error("tj-webhook error", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" }});
  }
});
