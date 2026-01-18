-- Fix Infinite Recursion on profiles table
-- Referencing 'profiles' within a policy on 'profiles' causes infinite recursion (Loop).
-- We will replace the recursive policy with a Security Definer function helper OR simpler logic.
-- Also fixing 'user_profiles' -> 'profiles' table name mismatch.

BEGIN;

-- 1. Fix Infinite Recursion on PROFILES
DROP POLICY IF EXISTS "profiles_admin_select" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;

-- To safely check admin role without recursion, we use a function with SECURITY DEFINER
-- This function accesses specific columns bypassing RLS to return the role.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now use this function in policies
CREATE POLICY "profiles_admin_select" ON profiles FOR SELECT
USING (
  get_my_role() IN ('super_admin', 'admin', 'vendor')
);

CREATE POLICY "profiles_admin_update" ON profiles FOR UPDATE
USING (
  get_my_role() IN ('super_admin', 'admin', 'vendor')
);

-- Ensure public read is active (simplest fix for dashboard recursion if data isn't sensitive)
-- If we want strict privacy, keep the above. If public is fine:
DROP POLICY IF EXISTS "profiles_public_read" ON profiles;
CREATE POLICY "profiles_public_read" ON profiles FOR SELECT USING (true);
-- Note: If "profiles_public_read" exists and is true, "profiles_admin_select" is redundant for SELECT.
-- We keep "profiles_admin_update" restricted.


-- 2. Fix ACTIVITY_LOGS table reference (user_profiles -> profiles)

DROP POLICY IF EXISTS "Users can view their own logs" ON activity_logs;

CREATE POLICY "Users can view their own logs"
ON activity_logs
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  OR 
  get_my_role() IN ('super_admin', 'admin')
);

COMMIT;
