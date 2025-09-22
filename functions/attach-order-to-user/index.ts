// attach-order-to-user/index.ts
import { serve } from "std/server";
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { fetch });

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    const body = await req.json();
    const { order_reference, user_id } = body;
    if (!order_reference || !user_id) return new Response(JSON.stringify({ error: "order_reference and user_id required" }), { status: 400, headers: { "Content-Type": "application/json" }});

    const { data: order, error } = await supabase.from("orders").select("*").eq("order_reference", order_reference).single();
    if (error || !order) return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: { "Content-Type": "application/json" }});

    await supabase.from("orders").update({ user_id, email_verified: true, updated_at: new Date().toISOString() }).eq("id", order.id);

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" }});
  } catch (err) {
    console.error("attach-order error", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" }});
  }
});
