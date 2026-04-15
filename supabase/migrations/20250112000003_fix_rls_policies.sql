-- Fix RLS policies to prevent recursion issues
-- Drop problematic policies and create new ones using SECURITY DEFINER functions

BEGIN;

-- Drop all existing policies on profiles that might cause recursion
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Create new policies using SECURITY DEFINER functions
CREATE POLICY "users_select_own_profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own_profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "admins_select_all_profiles" ON public.profiles
FOR SELECT USING (public.is_admin_or_super_admin(auth.uid()));

CREATE POLICY "admins_update_all_profiles" ON public.profiles
FOR UPDATE USING (public.is_admin_or_super_admin(auth.uid()));

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

COMMIT;