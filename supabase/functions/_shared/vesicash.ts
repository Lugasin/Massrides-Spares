import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export interface VesicashConfig {
  apiBaseUrl: string;
  paymentWebhookUrl: string;
  refundWebhookUrl: string;
  secretKey: string | null;
  publicKey: string | null;
  webhookSecret: string | null;
  apiKey: string | null;
  countryId: string | null;
}

const DEFAULT_VESICASH_API_URL = "https://api.mor.vesicash.com/v1";
const DEFAULT_VESICASH_WEBHOOK_URL =
  "https://ocfljbhgssymtbjsunfr.supabase.co/functions/v1/handle-vesicash-webhook";

function cleanString(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    const unwrapped = trimmed.slice(1, -1).trim();
    return unwrapped.length > 0 ? unwrapped : null;
  }

  return trimmed;
}

function isHashedOrPlaceholder(value: string | null | undefined): boolean {
  if (!value) return true;
  const normalized = value.trim();
  const isHash = /^[a-f0-9]{64}$/i.test(normalized);
  const isPlaceholder =
    normalized.includes("YOUR_") ||
    normalized.toLowerCase().includes("placeholder");
  return isHash || isPlaceholder;
}

function selectCredential(
  preferredValue: string | null | undefined,
  fallbackValue: string | null | undefined,
  expectedPrefix: string,
) {
  const candidates = [preferredValue, fallbackValue].filter(
    (value): value is string => !!value && !isHashedOrPlaceholder(value),
  );

  const prefixedCandidate = candidates.find((value) => value.startsWith(expectedPrefix));
  return prefixedCandidate ?? candidates[0] ?? null;
}

function resolveConfigSource(
  selectedValue: string | null,
  preferredValue: string | null | undefined,
  fallbackValue: string | null | undefined,
) {
  if (selectedValue && selectedValue === preferredValue) {
    return "vault";
  }

  if (selectedValue && selectedValue === fallbackValue) {
    return "environment";
  }

  return "missing";
}

function normalizeBaseUrl(value: string | null | undefined) {
  const base = cleanString(value) ?? DEFAULT_VESICASH_API_URL;
  const trimmed = base.replace(/\/$/, "");
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

async function loadVaultConfig(supabase: SupabaseClient): Promise<Partial<VesicashConfig>> {
  const { data, error } = await supabase.rpc("get_vesicash_config");

  if (error) {
    console.warn("Falling back to Vesicash env config:", error.message);
    return {};
  }

  if (!data || typeof data !== "object") {
    return {};
  }

  const config = data as Record<string, unknown>;

  return {
    apiBaseUrl: cleanString(config.api_url),
    paymentWebhookUrl: cleanString(config.webhook_url),
    refundWebhookUrl: cleanString(config.refund_webhook_url),
    secretKey: cleanString(config.secret_key),
    publicKey: cleanString(config.public_key),
    webhookSecret: cleanString(config.webhook_secret),
    apiKey: cleanString(config.api_key),
    countryId: cleanString(config.country_id),
  };
}

export async function loadVesicashConfig(supabase: SupabaseClient): Promise<VesicashConfig> {
  const vaultConfig = await loadVaultConfig(supabase);

  const envSecretKey = cleanString(Deno.env.get("VESICASH_SECRET_KEY"));
  const envPublicKey = cleanString(Deno.env.get("VESICASH_PUBLIC_KEY"));

  const secretKey = selectCredential(vaultConfig.secretKey, envSecretKey, "morSec_");
  const publicKey = selectCredential(vaultConfig.publicKey, envPublicKey, "morPub_");

  const paymentWebhookUrl =
    vaultConfig.paymentWebhookUrl ??
    cleanString(Deno.env.get("VESICASH_WEBHOOK_URL")) ??
    DEFAULT_VESICASH_WEBHOOK_URL;

  const refundWebhookUrl =
    vaultConfig.refundWebhookUrl ??
    cleanString(Deno.env.get("VESICASH_REFUND_WEBHOOK_URL")) ??
    paymentWebhookUrl;

  console.log("Vesicash Config Loaded:", {
    apiBaseUrl: normalizeBaseUrl(vaultConfig.apiBaseUrl ?? Deno.env.get("VESICASH_API_URL")),
    hasSecretKey: !!secretKey,
    hasPublicKey: !!publicKey,
    secretSource: resolveConfigSource(secretKey, vaultConfig.secretKey, envSecretKey),
    publicSource: resolveConfigSource(publicKey, vaultConfig.publicKey, envPublicKey),
  });

  return {
    apiBaseUrl: normalizeBaseUrl(vaultConfig.apiBaseUrl ?? Deno.env.get("VESICASH_API_URL")),
    paymentWebhookUrl,
    refundWebhookUrl,
    secretKey,
    publicKey,
    webhookSecret: vaultConfig.webhookSecret ?? cleanString(Deno.env.get("VESICASH_WEBHOOK_SECRET")),
    apiKey: vaultConfig.apiKey ?? cleanString(Deno.env.get("VESICASH_API_KEY")),
    countryId: vaultConfig.countryId ?? cleanString(Deno.env.get("VESICASH_COUNTRY_ID")),
  };
}

export function requireVesicashPaymentKeys(config: VesicashConfig) {
  if (!config.secretKey || !config.publicKey) {
    throw new Error("Vesicash API keys are not configured.");
  }
}

export function getVesicashApiHeaders(config: VesicashConfig, contentType = true) {
  requireVesicashPaymentKeys(config);

  return {
    ...(contentType ? { "Content-Type": "application/json" } : {}),
    "secret-key": config.secretKey!,
    "public-key": config.publicKey!,
  };
}

export type PaymentStatus = "pending" | "processing" | "authorised" | "paid" | "failed" | "cancelled" | "refunded";

export function normaliseVesicashStatus(providerStatus?: string | null, eventType?: string | null): PaymentStatus {
  const status = `${providerStatus ?? ""}`.toLowerCase();
  const event = `${eventType ?? ""}`.toLowerCase();

  // Refund cases
  if (
    event.includes("refund") ||
    status === "refunded" ||
    status === "partially_refunded"
  ) {
    return "refunded";
  }

  // Success cases (including card Success/Paid)
  if (
    event.includes("success") ||
    status === "success" ||
    status === "successful" ||
    status === "paid" ||
    status === "succeeded" ||
    status === "captured" ||
    status === "approved"
  ) {
    return "paid";
  }

  // Intermediate / Processing cases
  if (
    event.includes("process") ||
    status === "processing" ||
    status === "in_progress" ||
    status === "awaiting_confirmation" ||
    status === "pending_confirmation" ||
    status === "enrolled" ||
    status === "init"
  ) {
    return "processing";
  }

  // Authorization cases (Card 3DS/Ready)
  if (
    event.includes("author") ||
    status === "authorised" ||
    status === "authorized" ||
    status === "ready"
  ) {
    return "authorised";
  }

  // Failure cases
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

  // Cancellation cases
  if (event.includes("cancel") || status === "cancelled" || status === "canceled") {
    return "cancelled";
  }

  return "pending";
}

export async function getVesicashPaymentDetails(reference: string, config: VesicashConfig): Promise<Record<string, any>> {
  if (!reference) {
    throw new Error("Reference is required to fetch payment details.");
  }

  const response = await fetch(`${config.apiBaseUrl}/payment/${reference}`, {
    method: "GET",
    headers: getVesicashApiHeaders(config),
  });

  const payload: Record<string, any> = await response.json().catch(() => ({}));

  if (!response.ok || payload?.status !== "success" || !payload?.data) {
    // If it's a 404, the transaction might not be fully synced to the MOR sub-account yet
    if (response.status === 404) {
      return { status: "pending", reference };
    }
    throw new Error(payload?.message || `Vesicash API error (${response.status}) while fetching payment ${reference}`);
  }

  return payload.data as Record<string, unknown>;
}

export async function settlePayment(
  supabase: SupabaseClient,
  payment: { id: number; status: string; completed_at?: string | null },
  order: { id: number; status: string; payment_status: string; total_amount: number },
  nextPaymentStatus: PaymentStatus,
  metadata: {
    reference?: string | null;
    payment_id?: string | null;
    actor_id?: string | null;
    reason?: string | null;
  } = {}
) {
  const nextCompletedAt = nextPaymentStatus === "paid" 
    ? (payment.completed_at ?? new Date().toISOString()) 
    : payment.completed_at;

  const nextOrderStatus = resolveNextOrderStatus(order.status, nextPaymentStatus);

  // 1. Update Payment Status
  const { error: updatePaymentError } = await supabase
    .from("payments")
    .update({
      status: nextPaymentStatus,
      completed_at: nextCompletedAt,
      vesicash_transaction_id: metadata.reference ?? undefined,
      vesicash_payment_id: metadata.payment_id ?? undefined,
    })
    .eq("id", payment.id);

  if (updatePaymentError) throw updatePaymentError;

  // 2. Calculate Financial Splits if becoming 'paid'
  let platformFee = 0;
  let vendorEarning = 0;
  let commissionRate = 0.10; // Default 10%

  const orderUpdatePayload: Record<string, any> = {
    status: nextOrderStatus,
    payment_status: nextPaymentStatus,
  };

  if (nextPaymentStatus === "paid" && order.payment_status !== "paid") {
    try {
      const { data: feeData, error: rpcError } = await supabase.rpc("get_platform_commission_rate");
      if (!rpcError && feeData !== null && !isNaN(Number(feeData))) {
        commissionRate = Number(feeData) / 100;
      }
    } catch (e) {
      console.warn("Could not fetch commission rate, using default 10%");
    }

    const totalAmount = Number(order.total_amount || 0);
    platformFee = totalAmount * commissionRate;
    vendorEarning = totalAmount - platformFee;

    orderUpdatePayload.platform_fee = platformFee;
    orderUpdatePayload.vendor_earning = vendorEarning;
    orderUpdatePayload.payout_status = "escrow";
  }

  // 3. Update Order Status
  const { error: updateOrderError } = await supabase
    .from("orders")
    .update(orderUpdatePayload)
    .eq("id", order.id);

  if (updateOrderError) throw updateOrderError;

  return { 
    platformFee, 
    vendorEarning, 
    nextOrderStatus, 
    nextPaymentStatus,
    commissionRate 
  };
}

export function resolveNextOrderStatus(currentStatus: string | null, paymentStatus: PaymentStatus) {
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
