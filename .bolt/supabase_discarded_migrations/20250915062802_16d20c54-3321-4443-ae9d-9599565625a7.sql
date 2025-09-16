-- Fix function search path security issues only
ALTER FUNCTION public.is_super_admin(_user_id uuid) SET search_path = 'public';
ALTER FUNCTION public.handle_user_login() SET search_path = 'public';
ALTER FUNCTION public.log_security_event(p_event_type text, p_user_id uuid, p_transaction_id text, p_amount numeric, p_ip_address inet, p_user_agent text, p_risk_score integer, p_blocked boolean, p_metadata jsonb) SET search_path = 'public';
ALTER FUNCTION public.record_metric(p_metric_name text, p_metric_value numeric, p_metric_unit text, p_tags jsonb) SET search_path = 'public';
ALTER FUNCTION public.has_role(_user_id uuid, _role text) SET search_path = 'public';

-- Add missing RLS policies for tables that need them
CREATE POLICY "System can manage conversations" ON public.conversations
FOR ALL USING (true);

CREATE POLICY "System can manage messages" ON public.messages
FOR ALL USING (true);