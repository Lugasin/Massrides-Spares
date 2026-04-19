-- Seed FX Rate Cache to prevent Edge Function crashes
-- This provides a perpetual 1:1 fallback in the database

BEGIN;

INSERT INTO public.fx_rates (
    base_currency, 
    quote_currency, 
    rate, 
    provider, 
    fetched_at, 
    expires_at, 
    source_payload
) VALUES (
    'USD', 
    'ZMW', 
    1.0, 
    'manual_seeding', 
    now(), 
    '9999-12-31 23:59:59+00', 
    '{"note": "Manual 1:1 fallback seeded to prevent Edge Function crashes"}'::jsonb
) ON CONFLICT (base_currency, quote_currency) 
DO UPDATE SET 
    rate = 1.0, 
    provider = 'manual_seeding', 
    expires_at = '9999-12-31 23:59:59+00',
    updated_at = now();

COMMIT;
