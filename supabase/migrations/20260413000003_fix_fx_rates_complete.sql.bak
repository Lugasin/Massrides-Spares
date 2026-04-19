-- Fix fx_rates RLS policies - complete fix
-- Fixes all permission errors

-- Drop existing policies
DROP POLICY IF EXISTS "Allow read fx_rates" ON public.fx_rates;
DROP POLICY IF EXISTS "Service role full access fx_rates" ON public.fx_rates;
DROP POLICY IF EXISTS "Allow anon read fx_rates" ON public.fx_rates;

-- Allow all operations for authenticated users
DROP POLICY IF EXISTS "Allow authenticated fx_rates" ON public.fx_rates;
CREATE POLICY "Allow authenticated fx_rates" ON public.fx_rates
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow all operations for service role
DROP POLICY IF EXISTS "Allow service_role fx_rates" ON public.fx_rates;
CREATE POLICY "Allow service_role fx_rates" ON public.fx_rates
FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Allow read for anon
DROP POLICY IF EXISTS "Allow anon read fx_rates2" ON public.fx_rates;
CREATE POLICY "Allow anon read fx_rates2" ON public.fx_rates
FOR SELECT TO anon USING (true);

-- Grant table permissions directly
GRANT ALL ON public.fx_rates TO authenticated, service_role, anon;