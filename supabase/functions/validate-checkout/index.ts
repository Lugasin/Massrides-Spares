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
    if (!token) throw new Error("Unauthorized");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) throw new Error("Invalid user");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const origin = req.headers.get("origin");

    const { data: orderId, error } =
      await supabaseAdmin.rpc("create_order_from_cart", {
        _user_id: user.id,
        _shipping: body.shipping_address
      });

    if (error) throw error;

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    const callbackUrl = (origin ?? "https://massridesspares.netlify.app") + "/checkout/success";

    const paymentPayload = {
      amount: order.total_amount,
      currency: "ZMW",
      email: user.email,
      reference: `order_${orderId}`,
      callback_url: callbackUrl
    };

    const vesicashRes = await fetch(
      `${Deno.env.get("VESICASH_BASE_URL")}/payments/initiate`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "v-private-key": Deno.env.get("VESICASH_PRIVATE_KEY")!,
          "v-public-key": Deno.env.get("VESICASH_PUBLIC_KEY")!
        },
        body: JSON.stringify(paymentPayload)
      }
    );

    const vesicashData = await vesicashRes.json();

    if (!vesicashRes.ok) {
      throw new Error(vesicashData.message || "Vesicash initiation failed");
    }

    await supabaseAdmin.from("payments").insert({
      order_id: orderId,
      status: "initiated",
      vesicash_transaction_id: vesicashData.data.reference,
      amount: order.total_amount
    });

    await supabaseAdmin
      .from("orders")
      .update({ payment_status: "initiated" })
      .eq("id", orderId);

    return new Response(
      JSON.stringify({ payment_link: vesicashData.data.payment_link }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: "CHECKOUT_FAILED", message: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
