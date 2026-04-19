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

  if (
    event.includes("refund") ||
    status === "refunded" ||
    status === "partially_refunded"
  ) {
    return "refunded";
  }

  if (
    event.includes("success") ||
    status === "success" ||
    status === "successful" ||
    status === "paid" ||
    status === "succeeded"
  ) {
    return "paid";
  }

  if (
    event.includes("process") ||
    status === "processing" ||
    status === "in_progress" ||
    status === "awaiting_confirmation" ||
    status === "pending_confirmation"
  ) {
    return "processing";
  }

  if (
    event.includes("fail") ||
    event.includes("declin") ||
    event.includes("reject") ||
    event.includes("error") ||
    event.includes("expire") ||
    status === "failed" ||
    status === "declined" ||
    status === "rejected" ||
    status === "error" ||
    status === "expired"
  ) {
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

function resolveTimestampHeader(headers: Headers) {
  return (
    headers.get("mor-timestamp") ??
    headers.get("x-mor-timestamp") ??
    headers.get("timestamp") ??
    headers.get("x-timestamp")
  );
}

function verifyMorSignature(body: string, secret: string, signature: string, timestamp: string | null) {
  if (!timestamp) {
    return false;
  }

  const signedPayload = `${timestamp}.${body}`;
  const digest = createHmac("sha256", secret).update(signedPayload).digest("hex");
  return digest.toLowerCase() === signature.trim().toLowerCase();
}

function verifyLegacySignature(body: string, secret: string, signature: string) {
  const digest = createHmac("sha512", secret).update(body).digest("hex");
  return digest.toLowerCase() === signature.trim().toLowerCase();
}

function resolveNextOrderStatus(currentStatus: string | null, paymentStatus: PaymentStatus) {
  const current = (currentStatus ?? "").toLowerCase() === "completed"
    ? "delivered"
    : (currentStatus ?? "").toLowerCase();

  if (paymentStatus === "paid") {
    if (["shipped", "delivered", "cancelled"].includes(current)) {
      return currentStatus;
    }
    return "processing";
  }

  if (paymentStatus === "processing") {
    if (["shipped", "delivered", "cancelled"].includes(current)) {
      return currentStatus;
    }
    return "processing";
  }

  if (paymentStatus === "cancelled") {
    if (["shipped", "delivered"].includes(current)) {
      return currentStatus;
    }
    return "cancelled";
  }

  if (paymentStatus === "failed") {
    if (["shipped", "delivered", "cancelled"].includes(current)) {
      return currentStatus;
    }
    return "failed";
  }

  if (paymentStatus === "refunded") {
    return currentStatus;
  }

  if (current === "processing" || current === "shipped" || current === "delivered") {
    return currentStatus;
  }

  return "pending";
}

async function sendPaymentPushNotification(
  supabaseAdmin: ReturnType<typeof createClient>,
  order: { order_number: string | null; user_id: string | null },
  paymentStatus: PaymentStatus,
) {
  if (!order.user_id) {
    return;
  }

  try {
    const { error } = await supabaseAdmin.functions.invoke("send-push-notification", {
      body: {
        user_ids: [order.user_id],
        title: `Payment ${paymentStatus}`,
        message: `Order ${order.order_number} payment is now ${paymentStatus}.`,
        url: "/orders",
        type: "payment",
        persist_notification: false,
      },
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error("Failed to send payment push notification:", error);
  }
}

async function sendOrderReceiptIfNeeded(
  supabaseAdmin: ReturnType<typeof createClient>,
  paymentId: string | number,
  order: {
    id: string;
    order_number: string | null;
    total_amount?: number | null;
    user_id: string | null;
  },
) {
  try {
    const { data: existingReceiptLog, error: receiptLogError } = await supabaseAdmin
      .from("financial_audit_logs")
      .select("id")
      .eq("event_type", "order_receipt_sent")
      .eq("entity_type", "payment")
      .eq("entity_id", String(paymentId))
      .limit(1)
      .maybeSingle();

    if (receiptLogError) {
      throw receiptLogError;
    }

    if (existingReceiptLog) {
      return;
    }

    const { data: checkoutAuditLog, error: checkoutAuditError } = await supabaseAdmin
      .from("financial_audit_logs")
      .select("metadata")
      .eq("event_type", "payment_checkout_created")
      .eq("entity_type", "payment")
      .eq("entity_id", String(paymentId))
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (checkoutAuditError) {
      throw checkoutAuditError;
    }

    const checkoutMetadata = asObject(checkoutAuditLog?.metadata);
    if (!checkoutMetadata.send_receipt) {
      return;
    }

    const customer = asObject(checkoutMetadata.customer);
    let customerEmail = String(customer.email ?? "").trim();
    let customerName = String(customer.full_name ?? "").trim();

    if ((!customerEmail || !customerName) && order.user_id) {
      const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("email, full_name")
        .eq("user_id", order.user_id)
        .maybeSingle();

      customerEmail ||= String(profile?.email ?? "").trim();
      customerName ||= String(profile?.full_name ?? "").trim();
    }

    if (!customerEmail) {
      throw new Error("No customer email found for the paid order.");
    }

    const { data: orderItems, error: orderItemsError } = await supabaseAdmin
      .from("order_items")
      .select("quantity, price_snapshot, product:products(name)")
      .eq("order_id", order.id);

    if (orderItemsError) {
      throw orderItemsError;
    }

    const items = (orderItems ?? []).map((item) => ({
      name: item.product?.name ?? "Product",
      quantity: Number(item.quantity ?? 0),
      price: Number(item.price_snapshot ?? 0),
    }));

    const { error: emailError } = await supabaseAdmin.functions.invoke("send-notification-email", {
      body: {
        to: customerEmail,
        subject: `Order Confirmation #${order.order_number}`,
        type: "order_confirmation",
        data: {
          order_number: order.order_number,
          total: Number(order.total_amount ?? 0),
          customer_name: customerName || null,
          items,
        },
      },
    });

    if (emailError) {
      throw emailError;
    }

    await supabaseAdmin.from("financial_audit_logs").insert({
      event_type: "order_receipt_sent",
      entity_type: "payment",
      entity_id: String(paymentId),
      amount: Number(order.total_amount ?? 0) || null,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        customer_email: customerEmail,
        customer_name: customerName || null,
        item_count: items.length,
        currency: 'USD', // Receipts are currently USD-priced snapshots
      },
    });
  } catch (error) {
    console.error("Failed to send order receipt:", error);
    await supabaseAdmin.from("financial_audit_logs").insert({
      event_type: "order_receipt_failed",
      entity_type: "payment",
      entity_id: String(paymentId),
      amount: Number(order.total_amount ?? 0) || null,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }
}

serve(async (req) => {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: jsonHeaders,
      });
    }

    const vesicash = await loadVesicashConfig(supabaseAdmin);
    const morSignature = req.headers.get("mor-signature");
    const legacySignature = req.headers.get("x-vesicash-signature");
    const body = await req.text();

    if (!vesicash.webhookSecret) {
      throw new Error("Missing VESICASH_WEBHOOK_SECRET.");
    }

    const verified =
      (morSignature && verifyMorSignature(body, vesicash.webhookSecret, morSignature, resolveTimestampHeader(req.headers))) ||
      (legacySignature && verifyLegacySignature(body, vesicash.webhookSecret, legacySignature));

    if (!verified) {
      throw new Error("Invalid webhook signature.");
    }

    const payload = JSON.parse(body);
    const eventType = String(payload.event || payload.type || "unknown");
    const data =
      payload.data && typeof payload.data === "object" && !Array.isArray(payload.data)
        ? payload.data as Record<string, unknown>
        : {};

    const paymentReference = resolvePaymentReference(payload, data);
    if (!paymentReference) {
      throw new Error("No payment reference found in webhook payload.");
    }

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .select("id, order_id, status, completed_at, vesicash_payment_id")
      .eq("vesicash_transaction_id", paymentReference)
      .maybeSingle();

    if (paymentError) {
      throw paymentError;
    }

    if (!payment) {
      throw new Error(`Payment not found for reference ${paymentReference}.`);
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, status, payment_status, user_id, total_amount")
      .eq("id", payment.order_id)
      .maybeSingle();

    if (orderError || !order) {
      throw new Error(orderError?.message || `Order not found for payment ${payment.id}.`);
    }

    const nextPaymentStatus = normalisePaymentStatus(eventType, String(data.status ?? ""));
    const nextOrderStatus = resolveNextOrderStatus(order.status, nextPaymentStatus);
    const nextCompletedAt =
      nextPaymentStatus === "paid" ? payment.completed_at ?? new Date().toISOString() : payment.completed_at;
    const nextPaymentId = String(data.payment_id ?? payment.vesicash_payment_id ?? "").trim() || null;
    const isDuplicate =
      payment.status === nextPaymentStatus &&
      (payment.vesicash_payment_id ?? null) === nextPaymentId &&
      order.payment_status === nextPaymentStatus &&
      order.status === nextOrderStatus;

    if (!isDuplicate) {
      const { error: updatePaymentError } = await supabaseAdmin
        .from("payments")
        .update({
          status: nextPaymentStatus,
          completed_at: nextCompletedAt,
          vesicash_payment_id: nextPaymentId,
        })
        .eq("id", payment.id);

      if (updatePaymentError) {
        throw updatePaymentError;
      }

      let commissionRate = 0.10; // Default 10%
      if (nextPaymentStatus === "paid") {
        try {
          const { data: feeData, error: rpcError } = await supabaseAdmin.rpc('get_platform_commission_rate');
          if (!rpcError && feeData !== null && !isNaN(Number(feeData))) {
             commissionRate = Number(feeData) / 100; // e.g. 10 returns 0.10
          }
        } catch (e) {
          console.warn("Could not fetch custom platform fee, using default 10%");
        }
      }

      const totalAmount = Number(order.total_amount ?? 0);
      const platformFee = totalAmount * commissionRate;
      const vendorEarning = totalAmount - platformFee;

      const orderUpdatePayload: Record<string, any> = {
          status: nextOrderStatus ?? order.status,
          payment_status: nextPaymentStatus,
      };

      // Apply Escrow lock and financial splits ONLY on successful payment
      if (nextPaymentStatus === "paid" && order.payment_status !== "paid") {
          orderUpdatePayload.platform_fee = platformFee;
          orderUpdatePayload.vendor_earning = vendorEarning;
          orderUpdatePayload.payout_status = 'escrow';
      }

      const { error: updateOrderError } = await supabaseAdmin
        .from("orders")
        .update(orderUpdatePayload)
        .eq("id", order.id);

      if (updateOrderError) {
        throw updateOrderError;
      }

      await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: order.user_id,
          title: `Payment ${nextPaymentStatus}`,
          message: `Order ${order.order_number} payment is now ${nextPaymentStatus}.`,
          type: "payment",
          link: "/orders",
        });

      await sendPaymentPushNotification(supabaseAdmin, order, nextPaymentStatus);

      if (nextPaymentStatus === "paid") {
        await sendOrderReceiptIfNeeded(supabaseAdmin, payment.id, order);
      }
    }

    await supabaseAdmin.from("financial_audit_logs").insert({
      event_type: isDuplicate ? "payment_webhook_duplicate" : `payment_${nextPaymentStatus}`,
      entity_type: "payment",
      entity_id: String(payment.id),
      amount: Number(data.amount ?? 0) || null,
      metadata: {
        order_id: payment.order_id,
        order_number: order.order_number,
        provider: "vesicash",
        reference: paymentReference,
        provider_status: data.status ?? null,
        payment_id: nextPaymentId,
        event_type: eventType,
        previous_payment_status: payment.status,
        next_payment_status: nextPaymentStatus,
        previous_order_status: order.status,
        next_order_status: nextOrderStatus,
        verification: morSignature ? "mor-signature" : "x-vesicash-signature",
        currency: String(data.currency || payload.currency || 'USD'),
        payload,
      },
    });

    return new Response(
      JSON.stringify({
        received: true,
        duplicate: isDuplicate,
        payment_reference: paymentReference,
        payment_status: nextPaymentStatus,
      }),
      {
        headers: jsonHeaders,
        status: 200,
      },
    );
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("Webhook Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: jsonHeaders,
    });
  }
});
