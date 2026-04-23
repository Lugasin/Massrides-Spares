-- Migration: Allow Admins to Update Payout Status (Reject functionality)

BEGIN;

-- 1. Grant UPDATE to authenticated users for vendor_payouts table
GRANT UPDATE ON public.vendor_payouts TO authenticated;

-- 2. Drop existing policy to avoid conflicts if previously created
DROP POLICY IF EXISTS "Admins can update payouts" ON public.vendor_payouts;

-- 3. Create RLS Policy: Only admins and super admins can update payout rows
CREATE POLICY "Admins can update payouts"
  ON public.vendor_payouts
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_super_admin(auth.uid()))
  WITH CHECK (public.is_admin_or_super_admin(auth.uid()));

COMMIT;
