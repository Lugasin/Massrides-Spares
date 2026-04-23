-- Migration: Server-side profile creation trigger + RBAC security hardening
-- Phase 1: Auth trigger for automatic profile creation
-- Phase 2: Lock down system_settings and orders RLS

BEGIN;

-- =============================================
-- PHASE 1: Auto-create user_profiles on signup
-- Replaces the removed client-side self-healing in AuthContext
-- =============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if profile already exists (idempotent)
  IF NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = NEW.id) THEN
    INSERT INTO public.user_profiles (
      id,
      user_id,
      email,
      full_name,
      phone,
      company_name,
      role,
      is_active,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
      COALESCE(NEW.raw_user_meta_data->>'phone', ''),
      COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
      'customer',
      true,
      now(),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- PHASE 2: Lock down system_settings RLS
-- Sensitive config (API URLs, webhook URLs) should NOT be publicly readable
-- =============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Public read system_settings" ON public.system_settings;

-- Restrict: only service_role can SELECT (Edge Functions use service_role)
-- Authenticated users/admins who need to view settings should use a SECURITY DEFINER RPC
CREATE POLICY "Service role read system_settings"
  ON public.system_settings
  FOR SELECT
  TO service_role
  USING (true);

-- =============================================
-- PHASE 3: Harden orders table
-- Deny direct client INSERTs — all orders must go through the create_order_from_cart RPC
-- =============================================

-- Remove any lingering insert policy
DROP POLICY IF EXISTS "Users insert own orders" ON public.orders;

-- Explicit deny via RLS: no INSERT from client roles
-- (SELECT is still allowed for users to view their own orders)
CREATE POLICY "Deny direct order insert by clients"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- =============================================
-- PHASE 4: Harden vendor_payouts RLS
-- Only service_role and admins should be able to touch payout records
-- =============================================

ALTER TABLE public.vendor_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read vendor_payouts" ON public.vendor_payouts;
DROP POLICY IF EXISTS "Service role manage vendor_payouts" ON public.vendor_payouts;

-- Service role has full access (used by Edge Functions)
CREATE POLICY "Service role manage vendor_payouts"
  ON public.vendor_payouts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMIT;
