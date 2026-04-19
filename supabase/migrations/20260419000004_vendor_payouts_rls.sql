-- Vendor Payouts RLS and Permissions Fix
-- This migration grants necessary insert/update permissions and creates RLS policies
-- to allow vendors to request withdrawals and admins to reject them.

BEGIN;

-- 1. Grant base permissions to authenticated users
GRANT INSERT, UPDATE ON public.vendor_payouts TO authenticated;

-- 2. Create RLS Policies for vendor_payouts
-- Policy: Vendors can view their own payouts, Admins can view all
DROP POLICY IF EXISTS "Vendors can view own payouts" ON public.vendor_payouts;
CREATE POLICY "Vendors can view own payouts" ON public.vendor_payouts
    FOR SELECT USING (
        auth.uid() = vendor_id OR 
        public.is_admin_or_super_admin(auth.uid())
    );

-- Policy: Vendors can insert their own payout requests
DROP POLICY IF EXISTS "Vendors can insert own payouts" ON public.vendor_payouts;
CREATE POLICY "Vendors can insert own payouts" ON public.vendor_payouts
    FOR INSERT WITH CHECK (
        auth.uid() = vendor_id
    );

-- Policy: Super Admins can update payout statuses (e.g., to reject)
DROP POLICY IF EXISTS "Admins can update payouts" ON public.vendor_payouts;
CREATE POLICY "Admins can update payouts" ON public.vendor_payouts
    FOR UPDATE USING (
        public.is_admin_or_super_admin(auth.uid())
    );

COMMIT;
