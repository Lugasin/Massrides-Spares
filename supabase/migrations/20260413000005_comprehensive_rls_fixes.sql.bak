-- =====================================================
-- Comprehensive RLS fixes for super_admin functionality
-- =====================================================

-- 1. Fix fx_rates RLS - allow all reads
DROP POLICY IF EXISTS "Allow authenticated fx_rates" ON fx_rates;
DROP POLICY IF EXISTS "Allow anon read fx_rates2" ON fx_rates;
DROP POLICY IF EXISTS "Allow service_role fx_rates" ON fx_rates;
DROP POLICY IF EXISTS "Public read fx_rates" ON fx_rates;

CREATE POLICY "Public read fx_rates" ON fx_rates
FOR SELECT TO anon, authenticated, service_role
USING (true);

GRANT SELECT ON fx_rates TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON fx_rates TO service_role;

-- 2. Fix user_profiles RLS - allow authenticated users to read all
DROP POLICY IF EXISTS "users_select_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "admins_select_all_profiles" ON user_profiles;
DROP POLICY IF EXISTS "admins_update_all_profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow authenticated read profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow service role read profiles" ON user_profiles;

-- Allow users to read their own profile
CREATE POLICY "users_select_own_profile" ON user_profiles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Allow users to update their own profile
CREATE POLICY "users_update_own_profile" ON user_profiles
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Allow admins/super_admins to read all profiles
CREATE POLICY "admins_select_all_profiles" ON user_profiles
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'support'))
);

-- Allow admins/super_admins to update all profiles  
CREATE POLICY "admins_update_all_profiles" ON user_profiles
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'support'))
);

-- Allow service_role full access
CREATE POLICY "service_role_all_profiles" ON user_profiles
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- 3. Fix activity_logs RLS for super_admin
DROP POLICY IF EXISTS "Admins can view all activity logs" ON activity_logs;

CREATE POLICY "Admins can view all activity logs" ON activity_logs
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'support'))
);

-- 4. Fix super_admin_financial_summary view access (if it exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'super_admin_financial_summary') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow authenticated read financial_summary" ON super_admin_financial_summary';
    EXECUTE 'CREATE POLICY "Allow authenticated read financial_summary" ON super_admin_financial_summary FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- 5. Ensure auth.users is accessible for joins (RLS is already disabled on auth schema)
-- Grant usage on auth schema
GRANT USAGE ON SCHEMA auth TO authenticated, service_role;
GRANT SELECT ON auth.users TO authenticated, service_role;

-- 6. Fix payments table for admin read
DROP POLICY IF EXISTS "Admins can view all payments" ON payments;

CREATE POLICY "Admins can view all payments" ON payments
FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'support'))
);

-- 7. Fix user_settings for authenticated users
DROP POLICY IF EXISTS "Users can manage their own settings" ON user_settings;

CREATE POLICY "Users can manage their own settings" ON user_settings
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
