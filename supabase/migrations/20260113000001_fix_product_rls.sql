-- Fix RLS policies by removing dependency on vendors table ID (BigInt)
-- Assumes products.vendor_id and inventory.vendor_id are UUIDs referencing auth.users/profiles

-- Products
DROP POLICY IF EXISTS "vendors_insert_own_products" ON products;
DROP POLICY IF EXISTS "vendors_update_own_products" ON products;
DROP POLICY IF EXISTS "vendors_delete_own_products" ON products;
DROP POLICY IF EXISTS "Vendor insert own products" ON products; -- remove my previous attempt name if it stuck
DROP POLICY IF EXISTS "vendors_manage_own_products" ON products;

CREATE POLICY "vendors_manage_own_products"
ON products FOR ALL
TO authenticated
USING ( vendor_id = auth.uid() )
WITH CHECK ( vendor_id = auth.uid() );

-- Inventory
DROP POLICY IF EXISTS "vendors_manage_own_inventory" ON inventory;

CREATE POLICY "vendors_manage_own_inventory"
ON inventory FOR ALL
TO authenticated
USING ( vendor_id = auth.uid() )
WITH CHECK ( vendor_id = auth.uid() );
