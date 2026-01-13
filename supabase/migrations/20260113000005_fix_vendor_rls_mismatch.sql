-- 1. Helper Function: Check if auth user owns the vendor
-- SECURITY DEFINER bypasses RLS on 'vendors' table to avoid recursion
CREATE OR REPLACE FUNCTION check_vendor_ownership(p_vendor_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cast owner_id to uuid to be safe
  RETURN EXISTS (
    SELECT 1 FROM vendors
    WHERE id = p_vendor_id
    AND owner_id::uuid = auth.uid()
  );
END;
$$;


