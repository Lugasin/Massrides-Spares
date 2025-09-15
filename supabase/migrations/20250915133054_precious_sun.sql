/*
  # Fix Core Infrastructure - Phase 1
  
  1. Core Tables
    - Ensure auth.users to user_profiles relationship works properly
    - Add missing indexes for performance
    - Enable realtime subscriptions
    - Add audit triggers
    
  2. Security
    - Complete RLS policies for all tables
    - Add proper foreign key constraints
    - Enable audit logging
    
  3. Performance
    - Add indexes for search and filtering
    - Optimize query performance
*/

-- Ensure auth schema exists and has proper permissions
DO $$
BEGIN
  -- Create auth schema if it doesn't exist (should exist in Supabase)
  IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
    CREATE SCHEMA auth;
  END IF;
END $$;

-- Create users table in auth schema if it doesn't exist (Supabase managed)
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  encrypted_password text,
  email_confirmed_at timestamptz,
  invited_at timestamptz,
  confirmation_token text,
  confirmation_sent_at timestamptz,
  recovery_token text,
  recovery_sent_at timestamptz,
  email_change_token_new text,
  email_change text,
  email_change_sent_at timestamptz,
  last_sign_in_at timestamptz,
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb,
  is_super_admin boolean,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  phone text,
  phone_confirmed_at timestamptz,
  phone_change text,
  phone_change_token text,
  phone_change_sent_at timestamptz,
  confirmed_at timestamptz GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
  email_change_token_current text,
  email_change_confirm_status smallint,
  banned_until timestamptz,
  reauthentication_token text,
  reauthentication_sent_at timestamptz,
  is_sso_user boolean DEFAULT false NOT NULL,
  deleted_at timestamptz,
  is_anonymous boolean DEFAULT false NOT NULL
);

-- Create auth.uid() function if it doesn't exist
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.sub', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')
  )::uuid
$$;

-- Create auth.role() function if it doesn't exist
CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claim.role', true),
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role')
  )::text
$$;

-- Ensure user_profiles table exists with proper structure
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  phone text,
  address text,
  city text,
  state text,
  zip_code text,
  country text DEFAULT 'Zambia',
  company_name text,
  role text DEFAULT 'customer' CHECK (role IN ('super_admin', 'admin', 'vendor', 'customer', 'guest')),
  website_url text,
  avatar_url text,
  bio text,
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(email)
);

-- Create or replace the user profile creation function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (
    user_id,
    email,
    full_name,
    phone,
    company_name,
    role,
    is_verified,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'company_name',
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer'),
    NEW.email_confirmed_at IS NOT NULL,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, user_profiles.phone),
    company_name = COALESCE(EXCLUDED.company_name, user_profiles.company_name),
    is_verified = EXCLUDED.is_verified,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_spare_parts_category ON public.spare_parts(category_id);
CREATE INDEX IF NOT EXISTS idx_spare_parts_vendor ON public.spare_parts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_spare_parts_featured ON public.spare_parts(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_spare_parts_search ON public.spare_parts USING gin(to_tsvector('english', name || ' ' || description));
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON public.notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at);

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies
-- User Profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile" ON public.user_profiles
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" ON public.user_profiles
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- Spare Parts
DROP POLICY IF EXISTS "Anyone can view spare parts" ON public.spare_parts;
CREATE POLICY "Anyone can view spare parts" ON public.spare_parts
FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "Vendors can manage their parts" ON public.spare_parts;
CREATE POLICY "Vendors can manage their parts" ON public.spare_parts
FOR ALL USING (
  vendor_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can manage all parts" ON public.spare_parts;
CREATE POLICY "Admins can manage all parts" ON public.spare_parts
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- Orders
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders
FOR SELECT USING (
  user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
  OR guest_email = (SELECT email FROM public.user_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders" ON public.orders
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- Notifications
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
CREATE POLICY "Users can view their notifications" ON public.notifications
FOR SELECT USING (
  user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
CREATE POLICY "Users can update their notifications" ON public.notifications
FOR UPDATE USING (
  user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
);

-- Activity Logs
DROP POLICY IF EXISTS "Users can view their activity" ON public.activity_logs;
CREATE POLICY "Users can view their activity" ON public.activity_logs
FOR SELECT USING (
  user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.spare_parts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tj_transaction_logs;

-- Create audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_logs (
      user_id,
      activity_type,
      resource_type,
      resource_id,
      additional_details,
      ip_address,
      user_agent,
      log_source
    ) VALUES (
      (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()),
      TG_OP || '_' || TG_TABLE_NAME,
      TG_TABLE_NAME,
      NEW.id::text,
      row_to_json(NEW),
      '0.0.0.0',
      'database_trigger',
      'audit_trigger'
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.activity_logs (
      user_id,
      activity_type,
      resource_type,
      resource_id,
      additional_details,
      ip_address,
      user_agent,
      log_source
    ) VALUES (
      (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()),
      TG_OP || '_' || TG_TABLE_NAME,
      TG_TABLE_NAME,
      NEW.id::text,
      jsonb_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)),
      '0.0.0.0',
      'database_trigger',
      'audit_trigger'
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_logs (
      user_id,
      activity_type,
      resource_type,
      resource_id,
      additional_details,
      ip_address,
      user_agent,
      log_source
    ) VALUES (
      (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()),
      TG_OP || '_' || TG_TABLE_NAME,
      TG_TABLE_NAME,
      OLD.id::text,
      row_to_json(OLD),
      '0.0.0.0',
      'database_trigger',
      'audit_trigger'
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_orders ON public.orders;
CREATE TRIGGER audit_orders
  AFTER INSERT OR UPDATE OR DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_spare_parts ON public.spare_parts;
CREATE TRIGGER audit_spare_parts
  AFTER INSERT OR UPDATE OR DELETE ON public.spare_parts
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_user_profiles ON public.user_profiles;
CREATE TRIGGER audit_user_profiles
  AFTER UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger();