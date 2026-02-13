-- Phase 3 Migration: Vendor Schema Alignment
-- This migration ensures products and inventory correctly reference the public.vendors table.

BEGIN;

-- 1. Update public.products to reference public.vendors
-- First, ensure we don't break existing data if possible, or allow the change if it's a refactor.
-- Check if the constraint already exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'products' AND constraint_name = 'products_vendor_id_fkey'
  ) THEN
    ALTER TABLE public.products DROP CONSTRAINT products_vendor_id_fkey;
  END IF;
END $$;

-- Update the foreign key to point to public.vendors(id)
-- Note: This assumes existing vendor_id values in products are now UUIDs matching vendors.id
-- If they currently reference auth.users.id, we'll need to mapping them later or ensure vendors are created.
ALTER TABLE public.products 
  ADD CONSTRAINT products_vendor_id_fkey 
  FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;

-- 2. Update public.inventory to reference public.vendors
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'inventory' AND constraint_name = 'inventory_vendor_id_fkey'
  ) THEN
    ALTER TABLE public.inventory DROP CONSTRAINT inventory_vendor_id_fkey;
  END IF;
END $$;

ALTER TABLE public.inventory 
  ADD CONSTRAINT inventory_vendor_id_fkey 
  FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;

-- 3. Add helper function to get vendor_id from user_id (for fallback/migration)
CREATE OR REPLACE FUNCTION public.get_vendor_id_for_user(target_user_id uuid)
RETURNS uuid AS $$
  SELECT id FROM public.vendors WHERE owner_id = target_user_id LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

COMMIT;
