-- =====================================================
-- Additional RLS Fixes for MassRides Agri PWA
-- Migration: 20260407000001_additional_rls_fixes.sql
-- =====================================================

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

-- Fix 11: Allow anon read of financial_audit_logs (for client-side queries)
DROP POLICY IF EXISTS "Allow anon read audit_logs" ON financial_audit_logs;
CREATE POLICY "Allow anon read audit_logs" ON financial_audit_logs 
FOR SELECT TO anon USING (true);

-- Fix 12: Allow service role full access to financial_audit_logs
DROP POLICY IF EXISTS "Allow service role audit_logs" ON financial_audit_logs;
CREATE POLICY "Allow service role audit_logs" ON financial_audit_logs 
FOR ALL TO service_role USING (true);