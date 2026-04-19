-- Fix fx_rates RLS policies to allow read access
-- Fixes 403 Forbidden error when fetching fx_rates

-- Allow authenticated users to read fx_rates
DROP POLICY IF EXISTS "Allow read fx_rates" ON public.fx_rates;
CREATE POLICY "Allow read fx_rates" ON public.fx_rates
FOR SELECT TO authenticated USING (true);

-- Allow service role full access
DROP POLICY IF EXISTS "Service role full access fx_rates" ON public.fx_rates;
CREATE POLICY "Service role full access fx_rates" ON public.fx_rates
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow anon read for public rate lookups (if needed)
DROP POLICY IF EXISTS "Allow anon read fx_rates" ON public.fx_rates;
CREATE POLICY "Allow anon read fx_rates" ON public.fx_rates
FOR SELECT TO anon USING (true);

-- Grant permissions
GRANT SELECT ON public.fx_rates TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE ON public.fx_rates TO service_role;