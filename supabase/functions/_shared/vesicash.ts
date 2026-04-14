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
  return trimmed.length > 0 ? trimmed : null;
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

  const paymentWebhookUrl =
    vaultConfig.paymentWebhookUrl ??
    cleanString(Deno.env.get("VESICASH_WEBHOOK_URL")) ??
    DEFAULT_VESICASH_WEBHOOK_URL;

  const refundWebhookUrl =
    vaultConfig.refundWebhookUrl ??
    cleanString(Deno.env.get("VESICASH_REFUND_WEBHOOK_URL")) ??
    paymentWebhookUrl;

  return {
    apiBaseUrl: normalizeBaseUrl(vaultConfig.apiBaseUrl ?? Deno.env.get("VESICASH_API_URL")),
    paymentWebhookUrl,
    refundWebhookUrl,
    secretKey: vaultConfig.secretKey ?? cleanString(Deno.env.get("VESICASH_SECRET_KEY")),
    publicKey: vaultConfig.publicKey ?? cleanString(Deno.env.get("VESICASH_PUBLIC_KEY")),
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
