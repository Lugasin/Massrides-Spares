-- Fix function search path security issues
ALTER FUNCTION public.is_super_admin(_user_id uuid) SET search_path = 'public';
ALTER FUNCTION public.handle_user_login() SET search_path = 'public';
ALTER FUNCTION public.log_security_event(p_event_type text, p_user_id uuid, p_transaction_id text, p_amount numeric, p_ip_address inet, p_user_agent text, p_risk_score integer, p_blocked boolean, p_metadata jsonb) SET search_path = 'public';
ALTER FUNCTION public.record_metric(p_metric_name text, p_metric_value numeric, p_metric_unit text, p_tags jsonb) SET search_path = 'public';
ALTER FUNCTION public.has_role(_user_id uuid, _role text) SET search_path = 'public';

-- Add missing RLS policies for tables that need them
-- conversations table policies
CREATE POLICY "System can manage conversations" ON public.conversations
FOR ALL USING (true);

-- messages table policies  
CREATE POLICY "System can manage messages" ON public.messages
FOR ALL USING (true);

-- Create test super admin accounts
-- First, create the auth users (this will be handled by the trigger)
-- Insert test super admin profiles
INSERT INTO public.user_profiles (
  user_id,
  email,
  full_name,
  role,
  is_verified,
  is_active,
  phone,
  company_name,
  created_at,
  updated_at
) VALUES 
(
  '00000000-0000-0000-0000-000000000001'::uuid,
  'superadmin@massrides.com',
  'Super Admin',
  'super_admin',
  true,
  true,
  '+260977123456',
  'Massrides Admin',
  now(),
  now()
),
(
  '00000000-0000-0000-0000-000000000002'::uuid,
  'admin@massrides.com', 
  'System Admin',
  'admin',
  true,
  true,
  '+260977123457',
  'Massrides Admin',
  now(),
  now()
)
ON CONFLICT (user_id) DO UPDATE SET 
  role = EXCLUDED.role,
  is_verified = EXCLUDED.is_verified,
  updated_at = now();

-- Create user settings for test accounts
INSERT INTO public.user_settings (
  user_id,
  email_notifications,
  push_notifications,
  marketing_emails,
  order_updates,
  theme,
  language,
  timezone,
  currency
) VALUES 
(
  (SELECT id FROM public.user_profiles WHERE email = 'superadmin@massrides.com'),
  true,
  true,
  false,
  true,
  'system',
  'en',
  'Africa/Lusaka',
  'USD'
),
(
  (SELECT id FROM public.user_profiles WHERE email = 'admin@massrides.com'),
  true,
  true,
  false,
  true,
  'system',
  'en', 
  'Africa/Lusaka',
  'USD'
)
ON CONFLICT (user_id) DO UPDATE SET updated_at = now();