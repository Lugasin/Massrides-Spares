-- Migration: Change vendor_id from Integer to UUID to match User IDs
-- Includes dropping policies that depend on the column before altering

-- 1. Products Table
-- Drop conflicting policy
DROP POLICY IF EXISTS "products_vendor_manage" ON public.products;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.products;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.products;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.products;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON public.products;

-- Drop existing Foreign Keys (Critical step!)
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_vendor_id_fkey;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS fk_products_vendor;

-- Clear existing integer IDs
UPDATE public.products SET vendor_id = NULL;

-- Change the column type (Explicitly using NULL only)
ALTER TABLE public.products 
ALTER COLUMN vendor_id TYPE uuid USING NULL;

-- Add Foreign Key to user_profiles
ALTER TABLE public.products
ADD CONSTRAINT fk_products_vendor
FOREIGN KEY (vendor_id) REFERENCES public.user_profiles(id);

-- Re-create Policies
-- A. Public Read
CREATE POLICY "Enable read access for all users" ON public.products
    FOR SELECT USING (true);

-- B. Vendor Manage (view/edit own products)
CREATE POLICY "products_vendor_manage" ON public.products
    FOR ALL
    USING (vendor_id = auth.uid())
    WITH CHECK (vendor_id = auth.uid());

-- 2. Inventory Table
-- Drop potential conflicting policies
DROP POLICY IF EXISTS "inventory_vendor_manage" ON public.inventory;
DROP POLICY IF EXISTS "Enable read for all" ON public.inventory;

-- Drop existing Foreign Keys
ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_vendor_id_fkey;
ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS fk_inventory_vendor;

-- Clear existing IDs
UPDATE public.inventory SET vendor_id = NULL;

-- Change the column type
ALTER TABLE public.inventory 
ALTER COLUMN vendor_id TYPE uuid USING NULL;

-- Add Foreign Key
ALTER TABLE public.inventory
ADD CONSTRAINT fk_inventory_vendor
FOREIGN KEY (vendor_id) REFERENCES public.user_profiles(id);

-- Re-create Policies
CREATE POLICY "inventory_vendor_manage" ON public.inventory
    FOR ALL
    USING (vendor_id = auth.uid())
    WITH CHECK (vendor_id = auth.uid());

CREATE POLICY "Enable read for all" ON public.inventory
    FOR SELECT USING (true);
