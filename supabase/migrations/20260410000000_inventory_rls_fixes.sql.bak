-- =====================================================
-- Inventory RLS fixes for vendor CRUD
-- =====================================================

-- Allow authenticated users to read inventory records used by dashboards.
DROP POLICY IF EXISTS "Authenticated read inventory" ON public.inventory;
CREATE POLICY "Authenticated read inventory" ON public.inventory
FOR SELECT TO authenticated USING (true);

-- Vendors can manage inventory rows for their own products, and admins can manage all inventory.
DROP POLICY IF EXISTS "Vendors manage own inventory" ON public.inventory;
CREATE POLICY "Vendors manage own inventory" ON public.inventory
FOR ALL TO authenticated
USING (
  -- Allow if user is vendor of the product
  EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id = inventory.product_id
      AND p.vendor_id = auth.uid()
  )
  -- OR if user is admin/super_admin
  OR EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.user_id = auth.uid()
      AND up.role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  -- Allow if user is vendor of the product
  EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id = inventory.product_id
      AND p.vendor_id = auth.uid()
  )
  -- OR if user is admin/super_admin
  OR EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.user_id = auth.uid()
      AND up.role IN ('admin', 'super_admin')
  )
);

-- Service role can manage inventory for edge functions and back-office jobs.
DROP POLICY IF EXISTS "Service role manage inventory" ON public.inventory;
CREATE POLICY "Service role manage inventory" ON public.inventory
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Inventory logs need the same ownership model.
DROP POLICY IF EXISTS "Vendors read own inventory logs" ON public.inventory_logs;
CREATE POLICY "Vendors read own inventory logs" ON public.inventory_logs
FOR SELECT TO authenticated
USING (
  auth.uid() = vendor_id
  OR EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id = inventory_logs.product_id
      AND p.vendor_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.user_id = auth.uid()
      AND up.role IN ('admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS "Vendors insert own inventory logs" ON public.inventory_logs;
CREATE POLICY "Vendors insert own inventory logs" ON public.inventory_logs
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = vendor_id
  OR EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id = inventory_logs.product_id
      AND p.vendor_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.user_profiles up
    WHERE up.user_id = auth.uid()
      AND up.role IN ('admin', 'super_admin')
  )
);

DROP POLICY IF EXISTS "Service role manage inventory logs" ON public.inventory_logs;
CREATE POLICY "Service role manage inventory logs" ON public.inventory_logs
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO authenticated;
GRANT SELECT, INSERT ON public.inventory_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_logs TO service_role;
