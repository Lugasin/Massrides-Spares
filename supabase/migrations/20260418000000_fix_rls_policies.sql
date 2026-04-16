-- Fix RLS policies for system_settings and inventory

-- =====================================================
-- Fix system_settings RLS - reference correct table (user_profiles)
-- =====================================================
DROP POLICY IF EXISTS "Admin update system_settings" ON public.system_settings;

CREATE POLICY "Admin update system_settings" ON public.system_settings
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  ));

-- =====================================================
-- Fix inventory RLS - simplify complex subqueries
-- =====================================================
DROP POLICY IF EXISTS "Vendors manage own inventory" ON public.inventory;

CREATE POLICY "Vendors manage own inventory" ON public.inventory
  FOR ALL 
  TO authenticated
  USING (
    vendor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = inventory.product_id
      AND p.vendor_id = auth.uid()
    )
  )
  WITH CHECK (
    vendor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
    OR EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = inventory.product_id
      AND p.vendor_id = auth.uid()
    )
  );

-- =====================================================
-- Add activity_logs RLS for proper access
-- =====================================================
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin view activity_logs" ON public.activity_logs;

CREATE POLICY "Admin view activity_logs" ON public.activity_logs
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  ));