-- Restore missing fx_rates table
-- This table was dropped but not recreated in the base schema, causing Edge Function crashes

BEGIN;

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

-- Enable RLS
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Public read fx_rates" ON public.fx_rates;
CREATE POLICY "Public read fx_rates" ON public.fx_rates FOR SELECT USING (true);

-- Grants
GRANT ALL ON public.fx_rates TO authenticated, service_role;
GRANT SELECT ON public.fx_rates TO anon;

COMMIT;
