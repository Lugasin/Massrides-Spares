-- Fix RLS policies to prevent recursion issues
-- Drop problematic policies and create new ones using SECURITY DEFINER functions

BEGIN;

-- Drop all existing policies on user_profiles that might cause recursion
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.user_profiles;

-- Create new policies using SECURITY DEFINER functions
CREATE POLICY "users_select_own_profile" ON public.user_profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_update_own_profile" ON public.user_profiles
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "admins_select_all_profiles" ON public.user_profiles
FOR SELECT USING (public.is_admin_or_super_admin(auth.uid()));

CREATE POLICY "admins_update_all_profiles" ON public.user_profiles
FOR UPDATE USING (public.is_admin_or_super_admin(auth.uid()));

-- Ensure RLS is enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

COMMIT;