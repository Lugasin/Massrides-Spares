-- 📦 Products and Inventory RLS Restoration
-- This migration ensures vendors and admins can manage product data correctly.

BEGIN;

-- 1. Enable RLS (Should already be enabled, but ensure it)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- 2. Clean up existing policies for products to avoid conflicts
DROP POLICY IF EXISTS "Public read products" ON public.products;
DROP POLICY IF EXISTS "Vendors manage own products" ON public.products;
DROP POLICY IF EXISTS "Admins manage all products" ON public.products;
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;

-- 3. Define Products Policies
-- Allow anyone to view products (catalog browsing)
CREATE POLICY "Public read products"
ON public.products FOR SELECT
USING (true);

-- Allow vendors to insert their own products
CREATE POLICY "Vendors can insert own products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (
    vendor_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
);

-- Allow vendors to update/delete their own products
CREATE POLICY "Vendors can manage own products"
ON public.products FOR ALL
TO authenticated
USING (
    vendor_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
)
WITH CHECK (
    vendor_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
);

-- 4. Define Inventory Policies
DROP POLICY IF EXISTS "Vendors manage own inventory" ON public.inventory;
DROP POLICY IF EXISTS "Public read inventory" ON public.inventory;

CREATE POLICY "Public read inventory"
ON public.inventory FOR SELECT
USING (true);

CREATE POLICY "Vendors manage own inventory"
ON public.inventory FOR ALL
TO authenticated
USING (
    vendor_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
)
WITH CHECK (
    vendor_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
);

-- 5. Grant explicit table permissions
GRANT ALL ON public.products TO authenticated;
GRANT ALL ON public.inventory TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

COMMIT;
