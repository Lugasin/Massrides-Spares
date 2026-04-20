-- Fix fx_rates schema: add missing rate_date column
-- The deployed Edge Function (_shared/fx-rate.ts line 176) selects:
--   "base_currency, quote_currency, provider, rate, rate_date, fetched_at, expires_at, source_payload"
-- Our restored table was missing 'rate_date', causing a PostgREST 400 error
-- which made resolveFxRateSnapshot() return null → crash on .rate

BEGIN;

ALTER TABLE public.fx_rates
    ADD COLUMN IF NOT EXISTS rate_date text;

-- Also ensure the seeded emergency row is still correct with the new column visible
UPDATE public.fx_rates
SET
    rate = 1.0,
    provider = 'emergency_fallback',
    rate_date = to_char(now(), 'YYYY-MM-DD'),
    expires_at = '9999-12-31 23:59:59+00',
    updated_at = now()
WHERE base_currency = 'USD' AND quote_currency = 'ZMW';

COMMIT;
