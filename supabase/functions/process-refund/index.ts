import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Auth Check (Admin Only)
    const authHeader = req.headers.get("authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) throw new Error("Invalid token");

    // Check Role
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || (profile.role !== "admin" && profile.role !== "super_admin")) {
      throw new Error("Unauthorized: Admin access required");
    }

    // 2. Parse Request
    const { order_id, reason } = await req.json();
    if (!order_id) throw new Error("Missing order_id");

    // 3. Fetch Payment Details
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", order_id)
      .single();

    if (paymentError || !payment) throw new Error("Payment record not found");
    if (!payment.vesicash_payment_id) throw new Error("No Vesicash Payment ID found");

    // 4. Call Vesicash Refund API
    const vesicashSecret = Deno.env.get("VESICASH_SECRET_KEY");
    const vesicashBaseUrl = Deno.env.get("VESICASH_BASE_URL") || "https://api.vesicash.com";

    console.log(`Initiating refund for Order ${order_id} (Payment ${payment.vesicash_payment_id})`);

    const refundPayload = {
      payment_id: payment.vesicash_payment_id,
      reason: reason || "Admin initiated refund",
      refund_amount: payment.amount, // Full refund for now
      currency: "ZMW"
    };

    const vesicashRes = await fetch(`${vesicashBaseUrl}/payments/refund`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${vesicashSecret}`,
      },
      body: JSON.stringify(refundPayload),
    });

    const vData = await vesicashRes.json();
    console.log("Vesicash Refund Response:", JSON.stringify(vData));

    if (!vesicashRes.ok || vData.status !== "success") {
      throw new Error(vData.message || "Vesicash refund failed");
    }

    // 5. Update Payment Status
    await supabase
      .from("payments")
      .update({ 
        status: "refunded",
        updated_at: new Date().toISOString()
      })
      .eq("id", payment.id);

    // 6. Update Order Status
    await supabase
      .from("orders")
      .update({ status: "cancelled" }) // Or 'refunded' if enum allows
      .eq("id", order_id);

    // 7. Audit Log
    await supabase.from("financial_audit_logs").insert({
      event_type: "refund_processed",
      entity_type: "order",
      entity_id: order_id,
      amount: payment.amount,
      actor_id: user.id,
      metadata: { 
        reason, 
        vesicash_response: vData 
      }
    });

    return new Response(
      JSON.stringify({ success: true, message: "Refund processed successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    const err = error as any;
    console.error("REFUND ERROR:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
