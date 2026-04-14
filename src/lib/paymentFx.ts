import type { FxRateSnapshot } from '@/lib/fxRate';

type JsonRecord = Record<string, unknown>;

export interface PaymentFxSourceRecord {
  base_currency?: string | null;
  quote_currency?: string | null;
  amount_usd?: number | string | null;
  amount_zmw?: number | string | null;
  exchange_rate?: number | string | null;
  fx_rate_provider?: string | null;
  fx_rate_source?: string | null;
  fx_rate_fetched_at?: string | null;
  fx_rate_locked_at?: string | null;
  fx_rate_payload?: unknown;
}

export interface PaymentFxSummary {
  amountUsd: number | null;
  amountZmw: number | null;
  exchangeRate: number | null;
  provider: string | null;
  source: string | null;
  fetchedAt: string | null;
  lockedAt: string | null;
  baseCurrency: string | null;
  quoteCurrency: string | null;
  providerTimestamp: string | null;
  rateDate: string | null;
  fallbackUsed: boolean;
  staleCacheUsed: boolean;
  cacheAgeMinutes: number | null;
  cacheExpiresAt: string | null;
  snapshot: FxRateSnapshot | null;
}

function asRecord(value: unknown): JsonRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as JsonRecord;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toStringValue(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function toBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return ['true', '1', 'yes'].includes(value.trim().toLowerCase());
  }

  return value === 1;
}

function parseFxSnapshot(value: unknown): FxRateSnapshot | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }

  const rate = toNumber(record.rate);
  const baseCurrency = toStringValue(record.base_currency);
  const quoteCurrency = toStringValue(record.quote_currency);
  const provider = toStringValue(record.provider);
  const source = toStringValue(record.source);
  const fetchedAt = toStringValue(record.fetched_at);

  if (
    rate === null ||
    !baseCurrency ||
    !quoteCurrency ||
    !provider ||
    !source ||
    !fetchedAt
  ) {
    return null;
  }

  return {
    base_currency: baseCurrency,
    quote_currency: quoteCurrency,
    rate,
    provider,
    source,
    fetched_at: fetchedAt,
    provider_timestamp: toStringValue(record.provider_timestamp),
    rate_date: toStringValue(record.rate_date),
    fallback_used: toBoolean(record.fallback_used),
    stale_cache_used: toBoolean(record.stale_cache_used),
    cache_expires_at: toStringValue(record.cache_expires_at),
    cache_age_minutes: toNumber(record.cache_age_minutes),
    payload: asRecord(record.payload) ?? {},
  };
}

function formatFallbackRate(amountUsd: number | null, exchangeRate: number | null) {
  if (amountUsd === null || exchangeRate === null) {
    return null;
  }

  return Number((amountUsd * exchangeRate).toFixed(2));
}

export function getPaymentFxSummary(
  payment?: PaymentFxSourceRecord | null,
  metadata?: unknown,
): PaymentFxSummary | null {
  const metadataRecord = asRecord(metadata);
  const metadataSnapshot = metadataRecord ? parseFxSnapshot(metadataRecord['fx_rate_snapshot']) : null;
  const paymentSnapshot = parseFxSnapshot(payment?.fx_rate_payload);
  const snapshot = metadataSnapshot ?? paymentSnapshot;

  const amountUsd = toNumber(payment?.amount_usd) ?? toNumber(metadataRecord?.['order_amount_usd']) ?? null;
  const exchangeRate = toNumber(payment?.exchange_rate) ?? toNumber(metadataRecord?.['exchange_rate']) ?? snapshot?.rate ?? null;
  const derivedAmountZmw = formatFallbackRate(amountUsd, exchangeRate);
  const amountZmw =
    toNumber(payment?.amount_zmw) ??
    toNumber(metadataRecord?.['payment_amount_zmw']) ??
    toNumber(metadataRecord?.['amount']) ??
    derivedAmountZmw;

  const provider = toStringValue(payment?.fx_rate_provider) ?? toStringValue(metadataRecord?.['fx_rate_provider']) ?? snapshot?.provider ?? null;
  const source = toStringValue(payment?.fx_rate_source) ?? toStringValue(metadataRecord?.['fx_rate_source']) ?? snapshot?.source ?? null;
  const fetchedAt = toStringValue(payment?.fx_rate_fetched_at) ?? toStringValue(metadataRecord?.['fx_rate_fetched_at']) ?? snapshot?.fetched_at ?? null;
  const lockedAt = toStringValue(payment?.fx_rate_locked_at) ?? toStringValue(metadataRecord?.['fx_rate_locked_at']) ?? null;
  const baseCurrency = toStringValue(payment?.base_currency) ?? snapshot?.base_currency ?? 'USD';
  const quoteCurrency = toStringValue(payment?.quote_currency) ?? snapshot?.quote_currency ?? 'ZMW';
  const providerTimestamp = snapshot?.provider_timestamp ?? null;
  const rateDate = snapshot?.rate_date ?? null;
  const fallbackUsed = snapshot?.fallback_used ?? toBoolean(metadataRecord?.['fx_rate_fallback_used']);
  const staleCacheUsed = snapshot?.stale_cache_used ?? toBoolean(metadataRecord?.['fx_rate_stale_cache_used']);
  const cacheAgeMinutes = snapshot?.cache_age_minutes ?? toNumber(metadataRecord?.['fx_rate_cache_age_minutes']) ?? null;
  const cacheExpiresAt = snapshot?.cache_expires_at ?? toStringValue(metadataRecord?.['fx_rate_cache_expires_at']) ?? null;

  const hasSummary = [
    amountUsd,
    amountZmw,
    exchangeRate,
    provider,
    source,
    fetchedAt,
    lockedAt,
    snapshot,
  ].some((value) => value !== null && value !== undefined);

  if (!hasSummary) {
    return null;
  }

  return {
    amountUsd,
    amountZmw,
    exchangeRate,
    provider,
    source,
    fetchedAt,
    lockedAt,
    baseCurrency,
    quoteCurrency,
    providerTimestamp,
    rateDate,
    fallbackUsed,
    staleCacheUsed,
    cacheAgeMinutes,
    cacheExpiresAt,
    snapshot,
  };
}

export function formatFxAmount(amount: number | null | undefined, currency: string) {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return 'N/A';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatFxRateLabel(summary: PaymentFxSummary | null) {
  if (!summary?.exchangeRate) {
    return 'FX rate unavailable';
  }

  const rate = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(summary.exchangeRate);

  return `${summary.baseCurrency || 'USD'} to ${summary.quoteCurrency || 'ZMW'} ${rate}`;
}

export function formatFxSourceLabel(summary: PaymentFxSummary | null) {
  if (!summary) {
    return 'Legacy payment record';
  }

  const parts = [summary.provider, summary.source].filter(Boolean);
  if (parts.length === 0) {
    return 'FX snapshot unavailable';
  }

  return parts.join(' / ');
}
