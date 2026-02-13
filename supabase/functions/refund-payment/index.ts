import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Security Check: Ensure user is super_admin
    const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'super_admin') {
        return new Response(JSON.stringify({ error: "Insufficient privileges" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    const body = await req.json();
    const { order_id } = body;

    if (!order_id) throw new Error("Order ID required");

    // Fetch order and payment
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (!order) throw new Error("Order not found");

    if (order.payment_status !== "paid")
      throw new Error("Cannot refund unpaid order");

    const { data: payment } = await supabaseAdmin
      .from("payments")
      .select("*")
      .eq("order_id", order_id)
      .eq("status", "paid")
      .single();

    if (!payment || !payment.vesicash_transaction_id) {
        throw new Error("Payment record not found or missing transaction ID");
    }

    const vesicashRes = await fetch(
      `${Deno.env.get("VESICASH_BASE_URL")}/payments/refund`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "v-private-key": Deno.env.get("VESICASH_PRIVATE_KEY")!,
          "v-public-key": Deno.env.get("VESICASH_PUBLIC_KEY")!
        },
        body: JSON.stringify({
          reference: payment.vesicash_transaction_id,
          amount: order.total_amount
        })
      }
    );

    const vesicashData = await vesicashRes.json();

    if (!vesicashRes.ok) {
        throw new Error(vesicashData.message || "Refund failed at provider");
    }

    await supabaseAdmin.from("orders").update({
      payment_status: "refunded",
      status: "refunded"
    }).eq("id", order_id);

    await supabaseAdmin.from("payments").update({
        status: "refunded"
    }).eq("id", payment.id);

    return new Response("Refund successful", {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
