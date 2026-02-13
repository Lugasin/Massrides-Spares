-- Migration: Fix anon/authenticated access permissions
-- After previous migrations, some tables may be returning 401 for the anon role.
-- This migration ensures:
--   1. anon and authenticated roles have SELECT on spare_parts
--   2. guest_cart_items has open access for guests
--   3. categories are readable by everyone

-- Grant explicit permissions on key tables
GRANT SELECT ON public.spare_parts TO anon, authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT ALL ON public.guest_cart_items TO anon, authenticated;
GRANT SELECT ON public.ads TO anon, authenticated;

-- Ensure spare_parts has a simple anon-readable policy
DROP POLICY IF EXISTS "Anyone can read active spare parts" ON public.spare_parts;
CREATE POLICY "Anyone can read active spare parts"
    ON public.spare_parts FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

-- Ensure guest_cart_items has open access for anon
DROP POLICY IF EXISTS "Anyone can manage guest cart items" ON public.guest_cart_items;
CREATE POLICY "Anyone can manage guest cart items"
    ON public.guest_cart_items FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- Ensure categories are readable
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
CREATE POLICY "Anyone can view categories"
    ON public.categories FOR SELECT
    TO anon, authenticated
    USING (true);

-- Grant usage on public schema to both roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
