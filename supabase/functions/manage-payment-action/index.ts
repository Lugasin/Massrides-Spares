import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { loadVesicashConfig, type VesicashConfig } from "../_shared/vesicash.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type PaymentAction = "reconcile_paid" | "mark_failed" | "cancel_payment" | "refund_payment";
type PaymentStatus = "pending" | "authorised" | "paid" | "failed" | "cancelled" | "refunded";

function getVesicashHeaders(config: VesicashConfig) {
  const secretKey = config.secretKey;
  const publicKey = config.publicKey;

  if (!secretKey || !publicKey) {
    throw new Error("Vesicash API keys are not configured.");
  }

  return {
    "Content-Type": "application/json",
    "secret-key": secretKey,
    "public-key": publicKey,
  };
}

function normaliseProviderStatus(providerStatus?: string | null): PaymentStatus {
  const status = `${providerStatus ?? ""}`.toLowerCase();

  if (["success", "successful", "paid", "succeeded"].includes(status)) {
    return "paid";
  }
  if (["authorised", "authorized"].includes(status)) {
    return "authorised";
  }
  if (["failed"].includes(status)) {
    return "failed";
  }
  if (["cancelled", "canceled"].includes(status)) {
    return "cancelled";
  }
  if (["refunded", "partially_refunded"].includes(status)) {
    return "refunded";
  }

  return "pending";
}

async function getProviderPaymentDetails(reference: string, config: VesicashConfig): Promise<Record<string, any>> {
  const response = await fetch(`${config.apiBaseUrl}/payment/${reference}`, {
    method: "GET",
    headers: getVesicashHeaders(config),
  });

  const payload: Record<string, any> = await response.json().catch(() => ({}));

  if (!response.ok || payload?.status !== "success" || !payload?.data) {
    throw new Error(payload?.message || "Failed to retrieve payment details from Vesicash.");
  }

  return payload.data as Record<string, unknown>;
}

async function queueProviderRefund(params: {
  amount: number;
  paymentReference: string;
  reason: string;
  momoPhoneNumber?: string | null;
}, config: VesicashConfig) {
  const refundPayload: Record<string, unknown> = {
    amount: params.amount,
    payment_reference: params.paymentReference,
    reason: params.reason,
  };

  const countryId = config.countryId;
  const refundWebhookUrl = config.refundWebhookUrl;

  if (countryId) {
    refundPayload.country_id = countryId;
  }

  if (params.momoPhoneNumber) {
    refundPayload.transfer_to = "mobile_number";
    refundPayload.momo_phone_number = params.momoPhoneNumber;
  }

  if (refundWebhookUrl) {
    refundPayload.webhook_url = refundWebhookUrl;
  }

  const response = await fetch(`${config.apiBaseUrl}/pay/refunds/process`, {
    method: "POST",
    headers: getVesicashHeaders(config),
    body: JSON.stringify(refundPayload),
  });

  const payload: Record<string, any> = await response.json().catch(() => ({}));

  if (!response.ok || payload?.status !== "success") {
    throw new Error(payload?.message || "Refund request was rejected by Vesicash.");
  }

  return payload;
}

function mapActionToPaymentStatus(action: PaymentAction) {
  switch (action) {
    case "reconcile_paid":
      return "paid";
    case "mark_failed":
      return "failed";
    case "cancel_payment":
      return "cancelled";
    case "refund_payment":
      return "refunded";
  }
}

function mapActionToOrderStatus(action: PaymentAction, currentStatus: string) {
  const current = currentStatus === "completed" ? "delivered" : currentStatus;

  switch (action) {
    case "reconcile_paid":
      if (["shipped", "delivered"].includes(current)) {
        return currentStatus;
      }
      return "processing";
    case "mark_failed":
      if (["shipped", "delivered"].includes(current)) {
        return currentStatus;
      }
      return "failed";
    case "cancel_payment":
      if (["shipped", "delivered"].includes(current)) {
        return currentStatus;
      }
      return "cancelled";
    case "refund_payment":
      return currentStatus;
  }
}

function eventTypeForAction(action: PaymentAction, settledRefund: boolean) {
  switch (action) {
    case "reconcile_paid":
      return "payment_reconciled_paid";
    case "mark_failed":
      return "payment_reconciled_failed";
    case "cancel_payment":
      return "payment_reconciled_cancelled";
    case "refund_payment":
      return settledRefund ? "payment_refunded_manual" : "payment_refund_requested_manual";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userSupabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
    } = await userSupabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const { data: actorProfile, error: actorProfileError } = await supabase
      .from("user_profiles")
      .select("id, role, full_name, email")
      .eq("user_id", user.id)
      .single();

    if (actorProfileError || !actorProfile) {
      throw new Error(actorProfileError?.message || "User profile not found");
    }

    if (actorProfile.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const vesicash = await loadVesicashConfig(supabase);

    const body = await req.json();
    const paymentId = Number(body.paymentId);
    const reason = String(body.reason ?? "").trim();
    const action = String(body.action ?? "") as PaymentAction;
    const validActions: PaymentAction[] = ["reconcile_paid", "mark_failed", "cancel_payment", "refund_payment"];

    if (!paymentId || Number.isNaN(paymentId)) {
      throw new Error("Payment ID is required");
    }

    if (!validActions.includes(action)) {
      throw new Error("Invalid payment action");
    }

    if (!reason) {
      throw new Error("Reason is required");
    }

    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select(`
        id,
        order_id,
        provider,
        status,
        created_at,
        completed_at,
        vesicash_payment_id,
        vesicash_transaction_id,
        order:orders (
          id,
          order_number,
          status,
          payment_status,
          total_amount,
          shipping_address,
          user_id
        )
      `)
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      throw new Error(paymentError?.message || "Payment not found");
    }

    const paymentReference = payment.vesicash_transaction_id || payment.vesicash_payment_id;
    if (!paymentReference) {
      throw new Error("Payment is missing a Vesicash reference.");
    }

    const providerPayment = await getProviderPaymentDetails(paymentReference, vesicash);
    const providerStatus = normaliseProviderStatus(String(providerPayment.status ?? ""));
    const providerPaymentId = String(providerPayment.id ?? payment.vesicash_payment_id ?? "").trim() || null;
    const providerReference = String(providerPayment.reference ?? payment.vesicash_transaction_id ?? "").trim() || paymentReference;
    const currentOrderStatus = payment.order?.status || "pending";

    if (action === "reconcile_paid" && providerStatus !== "paid") {
      throw new Error(`Vesicash still reports this payment as ${providerStatus}. Paid reconciliation was blocked.`);
    }

    if (["mark_failed", "cancel_payment"].includes(action) && ["paid", "refunded"].includes(providerStatus)) {
      throw new Error(`Vesicash reports this payment as ${providerStatus}. Manual downgrade was blocked.`);
    }

    let refundResponse: Record<string, any> | null = null;
    if (action === "refund_payment") {
      if (providerStatus !== "paid") {
        throw new Error(`Only paid Vesicash transactions can be refunded. Current provider status is ${providerStatus}.`);
      }

      const refundAmount = Number(providerPayment.amount ?? 0);
      if (!refundAmount || Number.isNaN(refundAmount)) {
        throw new Error("Unable to determine the provider payment amount for refund.");
      }

      const shippingAddress = (payment.order?.shipping_address || {}) as Record<string, unknown>;
      const momoPhoneNumber =
        String(providerPayment.phone_number ?? shippingAddress.phone ?? "").trim() || undefined;

      refundResponse = await queueProviderRefund({
        amount: refundAmount,
        paymentReference: providerReference,
        reason,
        momoPhoneNumber,
      }, vesicash);
    }

    const requestedPaymentStatus = mapActionToPaymentStatus(action);
    const settledRefund = action === "refund_payment"
      ? normaliseProviderStatus(String(refundResponse?.data?.status ?? refundResponse?.status ?? "")) === "refunded"
      : false;
    const targetPaymentStatus = action === "refund_payment" && !settledRefund ? payment.status : requestedPaymentStatus;
    const targetOrderStatus = mapActionToOrderStatus(action, currentOrderStatus);
    const targetPaymentStatusForOrder = action === "refund_payment" && !settledRefund
      ? payment.order?.payment_status || payment.status
      : targetPaymentStatus;

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

    if (shouldUpdateLocalState) {
      const { error: paymentUpdateError } = await supabase
        .from("payments")
        .update({
          status: targetPaymentStatus,
          vesicash_transaction_id: providerReference,
          vesicash_payment_id: providerPaymentId,
          completed_at:
            targetPaymentStatus === "paid"
              ? payment.completed_at ?? new Date().toISOString()
              : payment.completed_at,
        })
        .eq("id", payment.id);

      if (paymentUpdateError) {
        throw paymentUpdateError;
      }

      const { error: orderUpdateError } = await supabase
        .from("orders")
        .update({
          payment_status: targetPaymentStatusForOrder,
          status: targetOrderStatus,
        })
        .eq("id", payment.order_id);

      if (orderUpdateError) {
        throw orderUpdateError;
      }
    }

    await supabase.from("financial_audit_logs").insert({
      actor_id: user.id,
      event_type: eventTypeForAction(action, settledRefund),
      entity_type: "payment",
      entity_id: String(payment.id),
      amount: Number(providerPayment.amount ?? payment.order?.total_amount ?? 0) || null,
      metadata: {
        action,
        reason,
        actor_role: actorProfile.role,
        actor_email: actorProfile.email,
        order_id: payment.order_id,
        order_number: payment.order?.order_number ?? null,
        provider: payment.provider,
        reference: providerReference,
        provider_status: providerStatus,
        provider_payment_id: providerPaymentId,
        local_state_updated: shouldUpdateLocalState,
        previous_payment_status: payment.status,
        next_payment_status: targetPaymentStatus,
        previous_order_status: payment.order?.status ?? null,
        next_order_status: targetOrderStatus,
        refund_response: refundResponse,
      },
    });

    await supabase.from("activity_logs").insert({
      user_id: user.id,
      action: "payment_admin_action",
      metadata: {
        action,
        reason,
        payment_id: payment.id,
        order_id: payment.order_id,
        reference: providerReference,
        provider_status: providerStatus,
        previous_payment_status: payment.status,
        next_payment_status: targetPaymentStatus,
      },
    });

    if (payment.order?.user_id) {
      await supabase.from("notifications").insert({
        user_id: payment.order.user_id,
        title: `Payment update for ${payment.order.order_number}`,
        message: action === "refund_payment" && !settledRefund
          ? "A refund request has been submitted and is awaiting provider confirmation."
          : `Your payment status is now ${targetPaymentStatus}.`,
        type: "payment",
        link: "/orders",
      });
    }

    const { data: updatedPayment, error: updatedPaymentError } = await supabase
      .from("payments")
      .select(`
        id,
        order_id,
        provider,
        status,
          created_at,
          completed_at,
          vesicash_payment_id,
          vesicash_transaction_id,
          order:orders (
            id,
            order_number,
            status,
            payment_status,
            total_amount,
            shipping_address,
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
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
