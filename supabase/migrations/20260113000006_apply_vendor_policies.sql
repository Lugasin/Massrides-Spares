-- 1. Helper Function: Check if auth user owns the vendor
-- SECURITY DEFINER bypasses RLS on 'vendors' table to avoid recursion

-- Overload 1: For UUID vendor_id
CREATE OR REPLACE FUNCTION check_vendor_ownership(p_vendor_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM vendors
    WHERE id = p_vendor_id -- Implicit cast if needed or if id is uuid
    AND owner_id::uuid = auth.uid()
  );
END;
$$;

-- Overload 2: For BigInt vendor_id
CREATE OR REPLACE FUNCTION check_vendor_ownership(p_vendor_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM vendors
    WHERE id = p_vendor_id -- Implicit cast if needed or if id is bigint
    AND owner_id::uuid = auth.uid()
  );
END;
$$;

-- 2. Products Policy: Use the helper function
DROP POLICY IF EXISTS "vendors_manage_own_products" ON products;

CREATE POLICY "vendors_manage_own_products"
ON products FOR ALL
TO authenticated
USING ( check_vendor_ownership(vendor_id) )
WITH CHECK ( check_vendor_ownership(vendor_id) );

-- 3. Inventory Policy: Use the helper function
DROP POLICY IF EXISTS "vendors_manage_own_inventory" ON inventory;

CREATE POLICY "vendors_manage_own_inventory"
ON inventory FOR ALL
TO authenticated
USING ( check_vendor_ownership(vendor_id) )
WITH CHECK ( check_vendor_ownership(vendor_id) );
