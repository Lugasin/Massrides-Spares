import { supabase } from '@/integrations/supabase/client';

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
  fallback_used?: boolean;
  stale_cache_used?: boolean;
  cache_expires_at?: string | null;
  cache_age_minutes?: number | null;
  payload?: Record<string, unknown>;
}

export interface FxRateResponse {
  fx_rate: FxRateSnapshot;
  source: FxRateSource;
  fallback_used: boolean;
  stale_cache_used: boolean;
  note: string;
}

const DEFAULT_BASE_CURRENCY = "USD";
const DEFAULT_QUOTE_CURRENCY = "ZMW";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_PUBLIC_SUPABASE_URL || "";
const FX_RATE_CACHE_PREFIX = "massrides_checkout_fx_rate";

function buildFxRateEndpoint(baseCurrency: string, quoteCurrency: string) {
  if (!SUPABASE_URL) {
    throw new Error("Supabase URL is not configured.");
  }

  const url = new URL(`${SUPABASE_URL.replace(/\/$/, "")}/functions/v1/get-fx-rate`);
  url.searchParams.set("base_currency", baseCurrency);
  url.searchParams.set("quote_currency", quoteCurrency);
  return url.toString();
}

function buildCacheKey(baseCurrency: string, quoteCurrency: string) {
  return `${FX_RATE_CACHE_PREFIX}:${baseCurrency.toUpperCase()}:${quoteCurrency.toUpperCase()}`;
}

function readCachedFxRateSnapshot(
  baseCurrency = DEFAULT_BASE_CURRENCY,
  quoteCurrency = DEFAULT_QUOTE_CURRENCY,
) {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(buildCacheKey(baseCurrency, quoteCurrency));
    if (!raw) {
      return null;
    }

    const cached = JSON.parse(raw) as FxRateSnapshot;
    if (
      !cached ||
      typeof cached !== "object" ||
      typeof cached.rate !== "number" ||
      !cached.base_currency ||
      !cached.quote_currency ||
      !cached.provider ||
      !cached.fetched_at
    ) {
      return null;
    }

    return cached;
  } catch {
    return null;
  }
}

function writeCachedFxRateSnapshot(snapshot: FxRateSnapshot) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      buildCacheKey(snapshot.base_currency, snapshot.quote_currency),
      JSON.stringify(snapshot),
    );
  } catch {
    // Ignore storage quota and privacy-mode failures.
  }
}

function isCachedSnapshotStale(snapshot: FxRateSnapshot) {
  if (!snapshot.cache_expires_at) {
    return true;
  }

  const expiresAt = new Date(snapshot.cache_expires_at);
  return Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now();
}

function toCachedResponse(snapshot: FxRateSnapshot, note: string): FxRateResponse {
  const staleCacheUsed = isCachedSnapshotStale(snapshot);
  const cachedSnapshot: FxRateSnapshot = {
    ...snapshot,
    source: "cache",
    fallback_used: true,
    stale_cache_used: staleCacheUsed,
  };

  return {
    fx_rate: cachedSnapshot,
    source: "cache",
    fallback_used: true,
    stale_cache_used: staleCacheUsed,
    note,
  };
}

export async function fetchCheckoutFxRate(
  baseCurrency = DEFAULT_BASE_CURRENCY,
  quoteCurrency = DEFAULT_QUOTE_CURRENCY,
) {
  const cachedSnapshot = readCachedFxRateSnapshot(baseCurrency, quoteCurrency);

  try {
    const { data: payload, error } = await supabase.functions.invoke('get-fx-rate', {
      method: 'POST',
      body: {
        base_currency: baseCurrency,
        quote_currency: quoteCurrency
      }
    });

    if (error) {
      const message = error.message || "Live exchange rate request failed.";

      if (cachedSnapshot) {
        return toCachedResponse(
          cachedSnapshot,
          `${message} Using the last cached exchange rate instead.`,
        );
      }

      throw new Error(message);
    }

    const responseData = payload as FxRateResponse | undefined;
    if (!responseData?.fx_rate || !Number.isFinite(responseData.fx_rate.rate)) {
      throw new Error(responseData?.note || "Live exchange rate is unavailable.");
    }

    writeCachedFxRateSnapshot(responseData.fx_rate);
    return responseData;
  } catch (error) {
    if (cachedSnapshot) {
      return toCachedResponse(
        cachedSnapshot,
        "Using the last cached exchange rate because the live FX service is unavailable.",
      );
    }

    throw error;
  }
}

export function getCachedCheckoutFxRateSnapshot(
  baseCurrency = DEFAULT_BASE_CURRENCY,
  quoteCurrency = DEFAULT_QUOTE_CURRENCY,
) {
  return readCachedFxRateSnapshot(baseCurrency, quoteCurrency);
}
