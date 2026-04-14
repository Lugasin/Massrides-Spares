-- =====================================================
-- RLS Fixes for MassRides Agri PWA
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/ocfljbhgssymtbjsunfr/sql
-- =====================================================

-- Fix 1: Allow authenticated users to read activity_logs
DROP POLICY IF EXISTS "Allow authenticated read" ON activity_logs;
CREATE POLICY "Allow authenticated read" ON activity_logs 
FOR SELECT TO authenticated USING (true);

-- Fix 2: Allow authenticated users to read financial_audit_logs
DROP POLICY IF EXISTS "Allow authenticated read" ON financial_audit_logs;
CREATE POLICY "Allow authenticated read" ON financial_audit_logs 
FOR SELECT TO authenticated USING (true);

-- Fix 3: Allow authenticated users to read user_profiles (for profile lookup in Edge Functions)
DROP POLICY IF EXISTS "Allow authenticated read profiles" ON user_profiles;
CREATE POLICY "Allow authenticated read profiles" ON user_profiles 
FOR SELECT TO authenticated USING (true);

-- Fix 4: Allow service role to read orders
DROP POLICY IF EXISTS "Allow service role read orders" ON orders;
CREATE POLICY "Allow service role read orders" ON orders 
FOR SELECT TO service_role USING (true);

-- Fix 5: Allow service role to read payments
DROP POLICY IF EXISTS "Allow service role read payments" ON payments;
CREATE POLICY "Allow service role read payments" ON payments 
FOR SELECT TO service_role USING (true);

-- Fix 6: Allow service role to read products
DROP POLICY IF EXISTS "Allow service role read products" ON products;
CREATE POLICY "Allow service role read products" ON products 
FOR SELECT TO service_role USING (true);

-- Fix 7: Allow service role to read user_profiles (for Edge Functions using service role key)
DROP POLICY IF EXISTS "Allow service role read profiles" ON user_profiles;
CREATE POLICY "Allow service role read profiles" ON user_profiles 
FOR SELECT TO service_role USING (true);

-- Verify user role - run this separately
-- SELECT up.role, au.email FROM user_profiles up JOIN auth.users au ON up.user_id = au.id WHERE au.email = 'mambwemwila1@gmail.com';

-- If role is NULL or not 'super_admin', run this:
-- UPDATE user_profiles 
-- SET role = 'super_admin' 
-- WHERE user_id = (SELECT id FROM auth.users WHERE email = 'mambwemwila1@gmail.com');