-- Fix infinite recursion in user_profiles RLS policies
-- The old policies queried user_profiles to check admin role, which triggered the policy again causing infinite recursion

-- Drop the recursive policies
DROP POLICY IF EXISTS "admins_select_all_profiles" ON user_profiles;
DROP POLICY IF EXISTS "admins_update_all_profiles" ON user_profiles;

-- Create non-recursive policies using auth.users (which has no RLS)
-- This avoids querying user_profiles which would trigger the policy again

-- Allow users to read their own profile (basic policy)
CREATE POLICY "users_select_own_profile" ON user_profiles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Allow users to update their own profile (basic policy)
CREATE POLICY "users_update_own_profile" ON user_profiles
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Allow admins/super_admins to read all profiles (non-recursive via auth.users)
CREATE POLICY "admins_select_all_profiles" ON user_profiles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = user_profiles.user_id
    AND EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.users.id 
      AND user_profiles.role IN ('admin', 'super_admin', 'support')
    )
  )
);

-- Allow admins/super_admins to update all profiles (non-recursive)
CREATE POLICY "admins_update_all_profiles" ON user_profiles
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = user_profiles.user_id
    AND EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.users.id 
      AND user_profiles.role IN ('admin', 'super_admin', 'support')
    )
  )
);

-- Allow service_role full access
DROP POLICY IF EXISTS "service_role_all_profiles" ON user_profiles;
CREATE POLICY "service_role_all_profiles" ON user_profiles
FOR ALL TO service_role
USING (true)
WITH CHECK (true);