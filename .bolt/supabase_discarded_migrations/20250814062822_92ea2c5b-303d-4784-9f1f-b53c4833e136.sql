-- Critical Security Fixes for Data Protection and Database Hardening

-- 1. Create specialized admin roles for different access levels
CREATE TYPE public.admin_role AS ENUM ('financial_admin', 'support_admin', 'system_admin');

-- 2. Create admin_roles table to track specialized permissions
CREATE TABLE public.admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  admin_role admin_role NOT NULL,
  granted_by UUID,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, admin_role)
);

-- Enable RLS on admin_roles table
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- Create policy for admin_roles - only system_admins can manage
CREATE POLICY "System admins manage admin roles"
  ON public.admin_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
      WHERE ar.user_id = (SELECT id FROM user_profiles WHERE user_id = auth.uid())
      AND ar.admin_role = 'system_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_roles ar
      WHERE ar.user_id = (SELECT id FROM user_profiles WHERE user_id = auth.uid())
      AND ar.admin_role = 'system_admin'
    )
  );

-- 3. Create security definer function to check admin roles
CREATE OR REPLACE FUNCTION public.has_admin_role(_user_id UUID, _admin_role admin_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_roles ar
    JOIN public.user_profiles up ON ar.user_id = up.id
    WHERE up.user_id = _user_id AND ar.admin_role = _admin_role
  )
$$;

-- 4. Fix existing database functions security
-- Update has_role function with proper search_path
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Update update_updated_at_column function with proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Update handle_new_user function with proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, full_name, role, is_verified)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name',''), 'customer', false)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 5. Restrict admin access to sensitive PII in user_profiles
-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Users can view their profile" ON public.user_profiles;

-- Create new restricted policies
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Support admins can view limited profile data (no PII like phone, address)
CREATE POLICY "Support admins limited profile access"
  ON public.user_profiles
  FOR SELECT
  USING (
    has_admin_role(auth.uid(), 'support_admin') AND
    -- This policy will be used with column-level security in application
    true
  );

-- System admins can view all profile data
CREATE POLICY "System admins full profile access"
  ON public.user_profiles
  FOR SELECT
  USING (has_admin_role(auth.uid(), 'system_admin'));

-- 6. Secure payment-related data in orders table
-- Drop existing overly permissive admin policies
DROP POLICY IF EXISTS "Users can read own orders" ON public.orders;

-- Create new restricted policies for orders
CREATE POLICY "Users can read own orders"
  ON public.orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles p
      WHERE p.id = orders.user_id AND p.user_id = auth.uid()
    )
  );

-- Financial admins can view all orders
CREATE POLICY "Financial admins can view orders"
  ON public.orders
  FOR SELECT
  USING (has_admin_role(auth.uid(), 'financial_admin'));

-- Support admins can view limited order data (no payment details)
CREATE POLICY "Support admins limited order access"
  ON public.orders
  FOR SELECT
  USING (
    has_admin_role(auth.uid(), 'support_admin')
    -- Application will filter out payment-sensitive fields
  );

-- 7. Highly restrict transaction logs access
-- Drop existing admin policy
DROP POLICY IF EXISTS "Admins read tj logs" ON public.tj_transaction_logs;

-- Only financial admins can access transaction logs
CREATE POLICY "Financial admins only tj logs access"
  ON public.tj_transaction_logs
  FOR SELECT
  USING (has_admin_role(auth.uid(), 'financial_admin'));

-- 8. Create audit log table for sensitive data access
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  sensitive_fields JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only system admins can read audit logs
CREATE POLICY "System admins read audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (has_admin_role(auth.uid(), 'system_admin'));

-- Create function to log sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  _action TEXT,
  _table_name TEXT,
  _record_id UUID DEFAULT NULL,
  _sensitive_fields JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    sensitive_fields,
    ip_address,
    user_agent
  )
  VALUES (
    auth.uid(),
    _action,
    _table_name,
    _record_id,
    _sensitive_fields,
    INET(current_setting('request.headers', true)::json->>'x-forwarded-for'),
    current_setting('request.headers', true)::json->>'user-agent'
  );
END;
$$;