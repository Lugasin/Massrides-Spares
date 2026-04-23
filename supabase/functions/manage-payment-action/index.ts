import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getVesicashApiHeaders, loadVesicashConfig, type VesicashConfig, getVesicashPaymentDetails, normaliseVesicashStatus, type PaymentStatus, settlePayment } from "../_shared/vesicash.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PaymentAction = "reconcile_paid" | "mark_failed" | "cancel_payment" | "refund_payment";

function eventTypeForAction(action: PaymentAction, settled: boolean): string {
  switch (action) {
    case "reconcile_paid": return "payment_reconciled_paid";
    case "mark_failed": return "payment_marked_failed";
    case "cancel_payment": return "payment_cancelled";
    case "refund_payment": return settled ? "payment_refunded" : "payment_refund_requested";
    default: return `payment_${action}`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { data: actorProfile, error: profileError } = await supabaseClient
      .from("user_profiles")
      .select("role, email")
      .eq("user_id", user.id)
      .single();

    if (profileError || !["admin", "super_admin"].includes(actorProfile?.role)) {
      throw new Error("Unauthorized - Admin access required");
    }

    const { paymentId, action, reason } = await req.json();

    if (!paymentId || !action) {
      throw new Error("paymentId and action are required");
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .select(`
        *,
        order:orders (
          id,
          order_number,
          status,
          payment_status,
          total_amount,
          user_id
        )
      `)
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      throw new Error("Payment record not found");
    }

    const config = await loadVesicashConfig(supabaseAdmin);
    const headers = getVesicashApiHeaders(config);
    
    let targetPaymentStatus: PaymentStatus = payment.status;
    let targetPaymentStatusForOrder: string = payment.order?.payment_status;
    let targetOrderStatus: string = payment.order?.status;
    let providerReference = payment.vesicash_transaction_id;
    let providerPaymentId = payment.vesicash_payment_id;
    let providerStatus = null;
    let providerPayment = null;
    let refundResponse = null;
    let settledRefund = false;

    // Default status mapping for actions
    const actionStatusMap: Record<PaymentAction, { pay: PaymentStatus, orderPay: string, order: string }> = {
      reconcile_paid: { pay: "paid", orderPay: "paid", order: "processing" },
      mark_failed: { pay: "failed", orderPay: "failed", order: "cancelled" },
      cancel_payment: { pay: "cancelled", orderPay: "cancelled", order: "cancelled" },
      refund_payment: { pay: "refunded", orderPay: "refunded", order: "cancelled" }
    };

    const targetMap = actionStatusMap[action as PaymentAction];
    if (targetMap) {
      targetPaymentStatus = targetMap.pay;
      targetPaymentStatusForOrder = targetMap.orderPay;
      targetOrderStatus = targetMap.order;
    }

    // Special logic for refund_payment (placeholder for now as it usually requires API call)
    if (action === "refund_payment") {
       // Typically you would call Vesicash Refund API here
       // For now, we assume it's settled if requested by admin
       settledRefund = true; 
    }

    const isNoOpStateChange =
      payment.status === targetPaymentStatus &&
      payment.order?.payment_status === targetPaymentStatusForOrder &&
      payment.order?.status === targetOrderStatus;

    if (isNoOpStateChange && !(action === "refund_payment" && refundResponse)) {
      return new Response(JSON.stringify({ payment, duplicate: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const shouldUpdateLocalState = action !== "refund_payment" || settledRefund;

    let financialInfo = null;
    if (shouldUpdateLocalState) {
      financialInfo = await settlePayment(
        supabaseAdmin,
        payment,
        payment.order as any,
        targetPaymentStatus,
        {
           reference: providerReference,
           payment_id: providerPaymentId,
           actor_id: user.id,
           reason
        }
      );
    }

    await supabaseAdmin.from("financial_audit_logs").insert({
      actor_id: user.id,
      event_type: eventTypeForAction(action, settledRefund),
      entity_type: "payment",
      entity_id: String(payment.id),
      amount: payment.order?.total_amount || null,
      metadata: {
        action,
        reason,
        actor_role: actorProfile.role,
        actor_email: actorProfile.email,
        order_id: payment.order_id,
        order_number: payment.order?.order_number ?? null,
        provider: payment.provider,
        reference: providerReference,
        local_state_updated: shouldUpdateLocalState,
        previous_payment_status: payment.status,
        next_payment_status: targetPaymentStatus,
        previous_order_status: payment.order?.status ?? null,
        next_order_status: financialInfo?.nextOrderStatus ?? targetOrderStatus,
        platform_fee: financialInfo?.platformFee,
        vendor_earning: financialInfo?.vendorEarning,
        commission_rate: financialInfo?.commissionRate,
      },
    });

    await supabaseAdmin.from("activity_logs").insert({
      user_id: user.id,
      action: "payment_admin_action",
      metadata: {
        action,
        reason,
        payment_id: payment.id,
        order_id: payment.order_id,
        reference: providerReference,
        previous_payment_status: payment.status,
        next_payment_status: targetPaymentStatus,
      },
    });

    if (payment.order?.user_id) {
      await supabaseAdmin.from("notifications").insert({
        user_id: payment.order.user_id,
        title: `Payment update for ${payment.order.order_number}`,
        message: action === "refund_payment" && !settledRefund
          ? "A refund request has been submitted and is awaiting provider confirmation."
          : `Your payment status is now ${targetPaymentStatus}.`,
        type: "payment",
        link: "/orders",
      });
    }

    const { data: updatedPayment, error: updatedPaymentError } = await supabaseAdmin
      .from("payments")
      .select(`
        *,
        order:orders (
          id,
          order_number,
          status,
          payment_status,
          total_amount,
          user_id
        )
      `)
      .eq("id", payment.id)
      .single();

    if (updatedPaymentError) {
      throw updatedPaymentError;
    }

    return new Response(JSON.stringify({ payment: updatedPayment, duplicate: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Manage payment action error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
