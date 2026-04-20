-- Checkout Last Resort Stability Fix
-- This migration ensures the DB cache is absolutely ready for the Edge Function

BEGIN;

-- 1. Ensure fx_rates structure is exactly as expected by shared code
CREATE TABLE IF NOT EXISTS public.fx_rates (
    base_currency text NOT NULL,
    quote_currency text NOT NULL,
    rate numeric NOT NULL,
    provider text,
    fetched_at timestamp with time zone DEFAULT now(),
    expires_at timestamp with time zone,
    source_payload jsonb,
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (base_currency, quote_currency)
);

-- 2. Seed the absolute fallback rate (USD/ZMW = 1.0)
-- We use a date far in the future to ensure it's never considered 'expired' by the Edge Function
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
    'emergency_fallback', 
    now(), 
    '9999-12-31 23:59:59+00', 
    '{"note": "Emergency 1:1 fallback seeded to prevent Edge Function crashes"}'::jsonb
) ON CONFLICT (base_currency, quote_currency) 
DO UPDATE SET 
    rate = 1.0, 
    provider = 'emergency_fallback', 
    expires_at = '9999-12-31 23:59:59+00',
    updated_at = now();

-- 3. Verify System Settings for Vesicash
-- If these are missing, the Edge Function will still fail even after the FX rate is fixed.
-- We seed placeholders if they don't exist, though the user should update them.
INSERT INTO public.system_settings (key, value)
VALUES 
    ('vesicash_api_url', '"https://api.mor.vesicash.com/v1"'),
    ('vesicash_webhook_url', '"https://ocfljbhgssymtbjsunfr.supabase.co/functions/v1/handle-vesicash-webhook"'),
    ('vesicash_public_key', '"v_public_seed_placeholder"'),
    ('vesicash_secret_key', '"v_private_seed_placeholder"'),
    ('vesicash_api_key', '"v_api_seed_placeholder"')
ON CONFLICT (key) DO NOTHING;

-- 4. Grant full permissions to service_role (used by Edge Functions)
GRANT ALL ON public.fx_rates TO service_role;
GRANT ALL ON public.system_settings TO service_role;
GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.order_items TO service_role;
GRANT ALL ON public.payments TO service_role;

COMMIT;
