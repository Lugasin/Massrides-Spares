import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

export type FxRateSource = "live" | "cache";

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

interface StoredFxRateRow {
  base_currency: string;
  quote_currency: string;
  provider: string;
  rate: number;
  rate_date: string | null;
  fetched_at: string;
  expires_at: string | null;
  source_payload: Record<string, unknown> | null;
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
const CACHE_TTL_MINUTES = Math.max(5, Number(Deno.env.get("FX_RATE_CACHE_TTL_MINUTES") ?? "15"));
const CACHE_TTL_MS = CACHE_TTL_MINUTES * 60 * 1000;

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

function buildSnapshot(args: {
  baseCurrency: string;
  quoteCurrency: string;
  providerRate: ProviderRateResult;
  source: FxRateSource;
  fallbackUsed: boolean;
  staleCacheUsed: boolean;
  fetchedAt: string;
  cacheExpiresAt: string | null;
  cacheAgeMinutes: number | null;
}): FxRateSnapshot {
  return {
    base_currency: args.baseCurrency,
    quote_currency: args.quoteCurrency,
    rate: roundRate(args.providerRate.rate),
    provider: args.providerRate.provider,
    source: args.source,
    fetched_at: args.fetchedAt,
    provider_timestamp: args.providerRate.providerTimestamp,
    rate_date: args.providerRate.rateDate,
    fallback_used: args.fallbackUsed,
    stale_cache_used: args.staleCacheUsed,
    cache_expires_at: args.cacheExpiresAt,
    cache_age_minutes: args.cacheAgeMinutes,
    payload: args.providerRate.payload,
  };
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

async function fetchExchangeRateApi(baseCurrency: string, quoteCurrency: string): Promise<ProviderRateResult> {
  const response = await fetch(
    `https://api.exchangerate-api.com/v4/latest/${encodeURIComponent(baseCurrency)}`,
    { headers: { Accept: "application/json" } },
  );

  const payload = asRecord(await response.json().catch(() => ({})));
  const responseRate = Number(asRecord(payload.rates)[quoteCurrency.toUpperCase()]);

  if (!response.ok) {
    throw new Error(`exchangerate-api returned ${response.status}.`);
  }

  if (!Number.isFinite(responseRate) || responseRate <= 0) {
    throw new Error("exchangerate-api did not return a valid exchange rate.");
  }

  return {
    provider: "exchangerate_api",
    rate: responseRate,
    providerTimestamp: typeof payload.time_last_updated === "number"
      ? new Date(payload.time_last_updated * 1000).toISOString()
      : null,
    rateDate: typeof payload.date === "string" ? payload.date : null,
    payload,
  };
}

async function fetchFawazCurrencyApi(baseCurrency: string, quoteCurrency: string): Promise<ProviderRateResult> {
  const baseLower = baseCurrency.toLowerCase();
  const quoteLower = quoteCurrency.toLowerCase();
  const response = await fetch(
    `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${encodeURIComponent(baseLower)}.json`,
    { headers: { Accept: "application/json" } },
  );

  const payload = asRecord(await response.json().catch(() => ({})));
  const rates = asRecord(payload[baseLower]);
  const responseRate = Number(rates[quoteLower]);

  if (!response.ok) {
    throw new Error(`fawazahmed0_api returned ${response.status}.`);
  }

  if (!Number.isFinite(responseRate) || responseRate <= 0) {
    throw new Error("fawazahmed0_api did not return a valid exchange rate.");
  }

  return {
    provider: "fawazahmed0_api",
    rate: responseRate,
    providerTimestamp: typeof payload.date === "string" ? payload.date : null,
    rateDate: typeof payload.date === "string" ? payload.date : null,
    payload,
  };
}

async function fetchLiveProviderRate(baseCurrency: string, quoteCurrency: string): Promise<ProviderRateResult> {
  const providerErrors: string[] = [];

  try {
    return await fetchExchangeRateApi(baseCurrency, quoteCurrency);
  } catch (error) {
    providerErrors.push(`exchangerate: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    return await fetchFawazCurrencyApi(baseCurrency, quoteCurrency);
  } catch (error) {
    providerErrors.push(`fawazahmed0: ${error instanceof Error ? error.message : String(error)}`);
  }

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

async function getCachedFxRate(
  supabaseAdmin: SupabaseClient,
  baseCurrency: string,
  quoteCurrency: string,
) {
  const { data, error } = await supabaseAdmin
    .from("fx_rates")
    .select("base_currency, quote_currency, provider, rate, rate_date, fetched_at, expires_at, source_payload")
    .eq("base_currency", baseCurrency)
    .eq("quote_currency", quoteCurrency)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as StoredFxRateRow | null) ?? null;
}

async function upsertFxRateCache(
  supabaseAdmin: SupabaseClient,
  snapshot: FxRateSnapshot,
) {
  const { error } = await supabaseAdmin
    .from("fx_rates")
    .upsert({
      base_currency: snapshot.base_currency,
      quote_currency: snapshot.quote_currency,
      provider: snapshot.provider,
      rate: snapshot.rate,
      rate_date: snapshot.rate_date,
      fetched_at: snapshot.fetched_at,
      expires_at: snapshot.cache_expires_at,
      source_payload: snapshot.payload,
      updated_at: new Date().toISOString(),
    }, { onConflict: "base_currency,quote_currency" });

  if (error) {
    throw error;
  }
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
  const cachedRate = await getCachedFxRate(supabaseAdmin, baseCurrency, quoteCurrency);

  if (cachedRate) {
    const cachedExpiresAt = cachedRate.expires_at ? new Date(cachedRate.expires_at) : null;
    const cachedFetchedAt = new Date(cachedRate.fetched_at);
    const cacheAgeMinutes = Number.isNaN(cachedFetchedAt.getTime())
      ? null
      : Math.max(0, Math.round((now.getTime() - cachedFetchedAt.getTime()) / 60000));

    if (cachedExpiresAt && cachedExpiresAt.getTime() > now.getTime()) {
      return buildSnapshot({
        baseCurrency,
        quoteCurrency,
        providerRate: {
          provider: cachedRate.provider,
          rate: Number(cachedRate.rate),
          providerTimestamp: toIsoString(cachedRate.fetched_at),
          rateDate: cachedRate.rate_date,
          payload: asRecord(cachedRate.source_payload),
        },
        source: "cache",
        fallbackUsed: true,
        staleCacheUsed: false,
        fetchedAt: cachedRate.fetched_at,
        cacheExpiresAt: cachedRate.expires_at,
        cacheAgeMinutes,
      });
    }
  }

  try {
    const liveRate = await fetchLiveProviderRate(baseCurrency, quoteCurrency);
    const fetchedAt = now.toISOString();
    const cacheExpiresAt = new Date(now.getTime() + CACHE_TTL_MS).toISOString();
    const snapshot = buildSnapshot({
      baseCurrency,
      quoteCurrency,
      providerRate: liveRate,
      source: "live",
      fallbackUsed: false,
      staleCacheUsed: false,
      fetchedAt,
      cacheExpiresAt,
      cacheAgeMinutes: 0,
    });

    await upsertFxRateCache(supabaseAdmin, snapshot);
    return snapshot;
  } catch (liveError) {
    if (cachedRate) {
      const cachedFetchedAt = new Date(cachedRate.fetched_at);
      const cacheAgeMinutes = Number.isNaN(cachedFetchedAt.getTime())
        ? null
        : Math.max(0, Math.round((now.getTime() - cachedFetchedAt.getTime()) / 60000));

      return buildSnapshot({
        baseCurrency,
        quoteCurrency,
        providerRate: {
          provider: cachedRate.provider,
          rate: Number(cachedRate.rate),
          providerTimestamp: toIsoString(cachedRate.fetched_at),
          rateDate: cachedRate.rate_date,
          payload: asRecord(cachedRate.source_payload),
        },
        source: "cache",
        fallbackUsed: true,
        staleCacheUsed: true,
        fetchedAt: cachedRate.fetched_at,
        cacheExpiresAt: cachedRate.expires_at,
        cacheAgeMinutes,
      });
    }

    throw new Error(
      liveError instanceof Error
        ? liveError.message
        : "Unable to fetch live FX rate and no cached rate exists.",
    );
  }
}
