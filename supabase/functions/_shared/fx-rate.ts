import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export type FxRateSource = "live" | "manual" | "cache";

export interface FxRateSnapshot {
  base_currency: string;
  quote_currency: string;
  rate: number;
  provider: string;
  source: FxRateSource;
  fetched_at: string;
  provider_timestamp?: string | null;
  rate_date?: string | null;
  fallback_used: boolean;
  stale_cache_used: boolean;
  cache_expires_at: string | null;
  cache_age_minutes: number | null;
  payload: Record<string, unknown>;
}

interface ProviderRateResult {
  provider: string;
  rate: number;
  providerTimestamp: string | null;
  rateDate: string | null;
  payload: Record<string, unknown>;
}

const DEFAULT_BASE_CURRENCY = "USD";
const DEFAULT_QUOTE_CURRENCY = "ZMW";

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalizeCurrencyCode(value: unknown, fallback: string) {
  const normalized = String(value ?? fallback).trim().toUpperCase();
  return normalized || fallback;
}

function toIsoString(value: string | number | Date | null | undefined) {
  if (!value) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function roundRate(rate: number) {
  return Number(rate.toFixed(8));
}

async function fetchFrankfurterRate(baseCurrency: string, quoteCurrency: string): Promise<ProviderRateResult> {
  const response = await fetch(
    `https://api.frankfurter.dev/v2/rate/${encodeURIComponent(baseCurrency)}/${encodeURIComponent(quoteCurrency)}`,
    { headers: { Accept: "application/json" } },
  );

  const payload = asRecord(await response.json().catch(() => ({})));

  if (!response.ok) {
    throw new Error(payload.message ? String(payload.message) : `Frankfurter returned ${response.status}.`);
  }

  const rate = Number(payload.rate);
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new Error("Frankfurter did not return a valid exchange rate.");
  }

  return {
    provider: "frankfurter",
    rate,
    providerTimestamp: toIsoString(payload.date as string | number | Date | undefined) ?? null,
    rateDate: typeof payload.date === "string" ? payload.date : null,
    payload,
  };
}

async function fetchOpenErApiRate(baseCurrency: string, quoteCurrency: string): Promise<ProviderRateResult> {
  const response = await fetch(
    `https://open.er-api.com/v6/latest/${encodeURIComponent(baseCurrency)}`,
    { headers: { Accept: "application/json" } },
  );

  const payload = asRecord(await response.json().catch(() => ({})));
  const responseRate = Number(asRecord(payload.rates)[quoteCurrency]);

  if (!response.ok || payload.result !== "success") {
    throw new Error(payload.error_type ? String(payload.error_type) : `open.er-api returned ${response.status}.`);
  }

  if (!Number.isFinite(responseRate) || responseRate <= 0) {
    throw new Error("open.er-api did not return a valid exchange rate.");
  }

  return {
    provider: "open_er_api",
    rate: responseRate,
    providerTimestamp: typeof payload.time_last_update_utc === "string"
      ? payload.time_last_update_utc
      : null,
    rateDate: typeof payload.time_last_update_utc === "string"
      ? payload.time_last_update_utc
      : null,
    payload,
  };
}

async function fetchLiveProviderRate(baseCurrency: string, quoteCurrency: string): Promise<ProviderRateResult> {
  const providerErrors: string[] = [];

  try {
    return await fetchFrankfurterRate(baseCurrency, quoteCurrency);
  } catch (error) {
    providerErrors.push(`frankfurter: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    return await fetchOpenErApiRate(baseCurrency, quoteCurrency);
  } catch (error) {
    providerErrors.push(`open_er_api: ${error instanceof Error ? error.message : String(error)}`);
  }

  throw new Error(`Unable to fetch live FX rate. ${providerErrors.join(" | ")}`);
}

export async function resolveFxRateSnapshot(
  supabaseAdmin: SupabaseClient,
  options?: {
    baseCurrency?: string;
    quoteCurrency?: string;
  },
): Promise<FxRateSnapshot> {
  const baseCurrency = normalizeCurrencyCode(options?.baseCurrency, DEFAULT_BASE_CURRENCY);
  const quoteCurrency = normalizeCurrencyCode(options?.quoteCurrency, DEFAULT_QUOTE_CURRENCY);
  const now = new Date();

  // 1. Check system_settings for manual rate and auto_fetch preference
  const { data: settingsData, error: settingsError } = await supabaseAdmin
    .from("system_settings")
    .select("value")
    .eq("key", "currency")
    .maybeSingle();

  if (settingsError) {
      console.error("Error fetching system_settings:", settingsError);
  }

  const currencySettings = asRecord(settingsData?.value);
  const autoFetch = !!currencySettings.auto_fetch;
  const manualRate = Number(currencySettings.exchange_rate ?? 28);

  // If autoFetch is enabled, try live providers
  if (autoFetch) {
    try {
      const liveRate = await fetchLiveProviderRate(baseCurrency, quoteCurrency);
      return {
        base_currency: baseCurrency,
        quote_currency: quoteCurrency,
        rate: roundRate(liveRate.rate),
        provider: liveRate.provider,
        source: "live",
        fetched_at: now.toISOString(),
        provider_timestamp: liveRate.providerTimestamp,
        rate_date: liveRate.rateDate,
        fallback_used: false,
        stale_cache_used: false,
        cache_expires_at: null,
        cache_age_minutes: 0,
        payload: liveRate.payload,
      };
    } catch (liveError) {
      console.error("Live FX fetch failed, falling back to manual rate:", liveError);
      // Fall through to manual rate
    }
  }

  // Fallback or explicit manual rate
  return {
    base_currency: baseCurrency,
    quote_currency: quoteCurrency,
    rate: roundRate(manualRate),
    provider: "system_settings",
    source: "manual",
    fetched_at: now.toISOString(),
    fallback_used: autoFetch, // true if it was a fallback from failed live attempt
    stale_cache_used: false,
    cache_expires_at: null,
    cache_age_minutes: null,
    payload: currencySettings,
  };
}
