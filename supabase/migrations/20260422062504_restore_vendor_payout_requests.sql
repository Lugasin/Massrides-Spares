-- Migration: Restore Vendor Payout RLS policies
-- Context: The 20260421000001_auth_rbac_hardening.sql migration locked down vendor_payouts to service_role entirely.
-- We must safely restore INSERT and SELECT for vendors so they can request payouts and view history,
-- as well as SELECT for admins so they can review payouts in the dashboard.

BEGIN;

-- 1. Grant table access to authenticated users
GRANT INSERT, SELECT ON public.vendor_payouts TO authenticated;

-- 2. Drop existing policies to prevent conflicts
DROP POLICY IF EXISTS "Vendors can view own payouts" ON public.vendor_payouts;
DROP POLICY IF EXISTS "Vendors can request payouts" ON public.vendor_payouts;
DROP POLICY IF EXISTS "Admins can view all payouts" ON public.vendor_payouts;

-- 3. Policy: Vendors can view their own payouts
CREATE POLICY "Vendors can view own payouts"
  ON public.vendor_payouts
  FOR SELECT
  TO authenticated
  USING (vendor_id = auth.uid());

-- 4. Policy: Admins can view all payouts
CREATE POLICY "Admins can view all payouts"
  ON public.vendor_payouts
  FOR SELECT
  TO authenticated
  USING (public.is_admin_or_super_admin(auth.uid()));

-- 5. Policy: Vendors can ONLY insert a pending payout for themselves
CREATE POLICY "Vendors can request payouts"
  ON public.vendor_payouts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    vendor_id = auth.uid() 
    AND status = 'pending'
  );

COMMIT;
