-- Restoration Financial and RPC Migration
-- This script restores the financial tables, security functions, and fixes column compatibility.

BEGIN;

-- 1. Restore Financial Audit Logs
CREATE TABLE IF NOT EXISTS public.financial_audit_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    event_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    amount numeric NOT NULL DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT financial_audit_logs_pkey PRIMARY KEY (id)
);

-- 2. Restore Vendor Payouts
CREATE TABLE IF NOT EXISTS public.vendor_payouts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vendor_id uuid NOT NULL,
    amount numeric NOT NULL CHECK (amount > 0),
    status text NOT NULL DEFAULT 'pending'::text,
    payout_reference text,
    failure_reason text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT vendor_payouts_pkey PRIMARY KEY (id),
    CONSTRAINT vendor_payouts_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES auth.users(id)
);

-- 3. Fix user_profiles column compatibility (Add user_id if missing)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'user_id') THEN
        ALTER TABLE public.user_profiles ADD COLUMN user_id uuid;
        UPDATE public.user_profiles SET user_id = id;
        ALTER TABLE public.user_profiles ALTER COLUMN user_id SET NOT NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
    END IF;
END $$;

-- 4. Restore Security RPC Functions
CREATE OR REPLACE FUNCTION public.current_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM public.user_profiles
    WHERE user_id = $1;

    RETURN COALESCE(user_role, 'customer');
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role text;
BEGIN
    SELECT role INTO user_role
    FROM public.user_profiles
    WHERE user_id = $1;

    RETURN user_role IN ('admin', 'super_admin');
END;
$$;

-- 5. Restore commission settings
CREATE TABLE IF NOT EXISTS public.commission_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id bigint REFERENCES public.categories(id),
    rate numeric NOT NULL CHECK (rate >= 0 AND rate <= 100),
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 6. Grant Permissions
ALTER TABLE public.financial_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_payouts ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.financial_audit_logs TO service_role;
GRANT ALL ON public.vendor_payouts TO service_role;
GRANT ALL ON public.commission_settings TO service_role;

GRANT SELECT ON public.financial_audit_logs TO authenticated;
GRANT SELECT ON public.vendor_payouts TO authenticated;

GRANT EXECUTE ON FUNCTION public.current_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_or_super_admin(uuid) TO authenticated;

COMMIT;
