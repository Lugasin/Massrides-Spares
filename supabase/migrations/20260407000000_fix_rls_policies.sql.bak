-- =====================================================
-- RLS Fixes for MassRides Agri PWA
-- Migration: 20260407000000_fix_rls_policies.sql
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

-- Fix 8: Allow anon/public read of activity_logs (for client-side queries)
DROP POLICY IF EXISTS "Allow anon read activity_logs" ON activity_logs;
CREATE POLICY "Allow anon read activity_logs" ON activity_logs 
FOR SELECT TO anon USING (true);

-- Fix 9: Allow authenticated insert to activity_logs (for logging actions)
DROP POLICY IF EXISTS "Allow authenticated insert activity_logs" ON activity_logs;
CREATE POLICY "Allow authenticated insert activity_logs" ON activity_logs 
FOR INSERT TO authenticated WITH CHECK (true);

-- Fix 10: Allow service role full access to activity_logs
DROP POLICY IF EXISTS "Allow service role activity_logs" ON activity_logs;
CREATE POLICY "Allow service role activity_logs" ON activity_logs 
FOR ALL TO service_role USING (true);