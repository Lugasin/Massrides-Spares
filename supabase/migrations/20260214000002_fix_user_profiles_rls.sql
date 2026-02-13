-- Migration: Fix user_profiles RLS infinite recursion (42P17)
--
-- ROOT CAUSE:
--   Policy "Admins can read all profiles" on user_profiles calls has_role('admin')
--   has_role() queries user_profiles -> triggers RLS -> calls has_role() again -> INFINITE RECURSION
--
-- FIX:
--   1. Create a SECURITY DEFINER function get_my_role() that bypasses RLS
--   2. Drop ONLY the recursive admin policy on user_profiles
--   3. Recreate that policy using get_my_role() instead
--   4. DO NOT drop has_role() as other policies depend on it
--   5. Only CREATE OR REPLACE has_role to ensure it has SECURITY DEFINER

-- Step 1: Create a dedicated role-checking function that BYPASSES RLS
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.user_profiles WHERE user_id = auth.uid();
$$;

-- Step 2: Ensure has_role is SECURITY DEFINER (CREATE OR REPLACE, no DROP)
CREATE OR REPLACE FUNCTION public.has_role(_role text, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Step 3: Drop ONLY the problematic policies on user_profiles
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.user_profiles;

-- Step 4: Recreate admin policy using get_my_role() which bypasses RLS
CREATE POLICY "Admins can read all profiles" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (public.get_my_role() IN ('admin', 'super_admin'));

-- Step 5: Ensure basic user policies exist
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile" ON public.user_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
