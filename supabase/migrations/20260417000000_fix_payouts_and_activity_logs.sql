-- Fix payouts table to use user_profiles instead of profiles
ALTER TABLE public.payouts DROP CONSTRAINT IF EXISTS payouts_processed_by_fkey;
ALTER TABLE public.payouts ADD CONSTRAINT payouts_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.user_profiles(id);

-- Ensure activity_logs uses auth.users consistently if preferred, or user_profiles
-- Current schema has activity_logs -> auth.users. That's fine.

-- system_settings updated_by already points to auth.users. Fine.

-- standardizing profiles: ensure roles are consistent
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE public.user_profiles ADD CONSTRAINT user_profiles_role_check CHECK (role = ANY (ARRAY['super_admin'::text, 'admin'::text, 'vendor'::text, 'customer'::text, 'guest'::text, 'support'::text]));
