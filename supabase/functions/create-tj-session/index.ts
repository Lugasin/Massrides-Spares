
// create-tj-session/index.ts
// Supabase Edge Function (Deno TypeScript)
// ENV required:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - TJ_API_KEY
// - APP_RETURN_URL

import { serve } from "std/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TJ_API_KEY = Deno.env.get("TJ_API_KEY")!;
const APP_RETURN_URL = Deno.env.get("APP_RETURN_URL")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { fetch });

async function createTjHppSession(order) {
  // TODO: adapt this payload to Transaction Junction's actual API.
  const payload = {
    amount: order.total,
    currency: order.currency || "ZMW",
    order_reference: order.order_reference,
    return_url: `${APP_RETURN_URL}/payment-return?order=${order.order_reference}`,
    customer: {
      email: order.customer_email,
      name: order.customer_name || null
    },
    metadata: { order_id: order.id }
  };

  const res = await fetch("https://api.transactionjunction.example/v1/hpp/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${TJ_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TJ create session failed: ${res.status} ${text}`);
  }

  return res.json(); // Expect { hpp_url, session_id, ... }
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    const body = await req.json();
    const { order_id } = body;
    if (!order_id) return new Response(JSON.stringify({ error: "order_id required" }), { status: 400, headers: { "Content-Type": "application/json" }});

    // Fetch order using service role
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (error || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: { "Content-Type": "application/json" }});
    }

    // Require email verified on order
    if (!order.email_verified) return new Response(JSON.stringify({ error: "Order email must be verified before payment" }), { status: 400, headers: { "Content-Type": "application/json" }});

    // Reserve inventory server-side using RPC
    try {
      await supabase.rpc('reserve_inventory_for_order', { o_id: order.id });
    } catch (e) {
      console.error("reserve inventory failed", e);
      return new Response(JSON.stringify({ error: "Failed to reserve inventory: " + e.message }), { status: 400, headers: { "Content-Type": "application/json" }});
    }

    // Create payments row
    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .insert([{
        order_id: order.id,
        vendor_id: order.vendor_id,
        provider: "tj",
        provider_session_id: null,
        amount: order.total,
        currency: order.currency,
        status: "initiated",
        created_at: new Date().toISOString()
      }])
      .select("*")
      .single();

    if (payErr) {
      console.error("create payment error", payErr);
      // release inventory on failure
      await supabase.rpc('release_inventory_for_order', { o_id: order.id });
      return new Response(JSON.stringify({ error: "Failed to create payment record" }), { status: 500, headers: { "Content-Type": "application/json" }});
    }

    // Call TJ API to create HPP session
    const tjResp = await createTjHppSession(order);
    const hppUrl = tjResp.hpp_url || tjResp.redirect_url || tjResp.url;
    const sessionId = tjResp.session_id || tjResp.id || null;

    // Save provider session id and raw payload
    await supabase
      .from("payments")
      .update({ provider_session_id: sessionId, raw_payload: tjResp, updated_at: new Date().toISOString() })
      .eq("id", payment.id);

    // set expires_at on order (e.g., 30 minutes from now)
    await supabase.from("orders").update({ status: "initiated", expires_at: new Date(Date.now() + 30*60*1000).toISOString(), updated_at: new Date().toISOString() }).eq("id", order.id);

    return new Response(JSON.stringify({ hpp_url: hppUrl }), { status: 200, headers: { "Content-Type": "application/json" }});

  } catch (err) {
    console.error("create-tj-session error", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" }});
  }
});
