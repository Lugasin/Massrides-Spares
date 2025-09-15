-- Fix remaining function search path issues
ALTER FUNCTION public.handle_new_user() SET search_path = 'public';
ALTER FUNCTION public.log_sensitive_access() SET search_path = 'public';

-- Add any missing RLS policies that might be needed for audit logs, if any
-- (The audit_logs table should only be accessible by super admins which is already set)