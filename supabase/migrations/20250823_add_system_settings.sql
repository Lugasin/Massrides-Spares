-- Create system_settings table for Super Admin controls
CREATE TABLE IF NOT EXISTS public.system_settings (
  id SERIAL PRIMARY KEY,
  maintenance_mode boolean DEFAULT false,
  allow_registrations boolean DEFAULT true,
  require_email_verification boolean DEFAULT true,
  max_upload_size integer DEFAULT 10, -- in MB
  allowed_file_types text[] DEFAULT ARRAY['jpg', 'png', 'pdf', 'doc', 'docx'],
  commission_rate numeric(5,2) DEFAULT 10.00, -- percentage
  tax_rate numeric(5,2) DEFAULT 16.00, -- percentage
  currency text DEFAULT 'ZMW',
  site_name text DEFAULT 'Massrides Agri',
  site_description text DEFAULT 'Agricultural Spare Parts Marketplace',
  contact_email text DEFAULT 'support@massrides.co.zm',
  contact_phone text DEFAULT '+260 XXX XXX XXX',
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

-- Ensure only one row exists in system_settings
CREATE UNIQUE INDEX IF NOT EXISTS system_settings_single_row ON public.system_settings ((id IS NOT NULL));

-- Insert default settings if not exists
INSERT INTO public.system_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();

-- Add RLS policies for system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Only super admins can view system settings
CREATE POLICY "Super admins can view system settings" 
ON public.system_settings 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role = 'super_admin'
  )
);

-- Only super admins can update system settings
CREATE POLICY "Super admins can update system settings" 
ON public.system_settings 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role = 'super_admin'
  )
);

-- Create admin_actions table for audit logging
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  target_type text,
  target_id text,
  description text,
  metadata jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS admin_actions_admin_id_idx ON public.admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS admin_actions_created_at_idx ON public.admin_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_actions_action_type_idx ON public.admin_actions(action_type);

-- RLS for admin_actions
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- Only admins can view admin actions
CREATE POLICY "Admins can view admin actions" 
ON public.admin_actions 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role IN ('admin', 'super_admin')
  )
);

-- Only system can insert admin actions (through functions)
CREATE POLICY "System can insert admin actions" 
ON public.admin_actions 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
  p_action_type text,
  p_target_type text DEFAULT NULL,
  p_target_id text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Get the admin's profile id
  SELECT id INTO v_admin_id
  FROM public.user_profiles
  WHERE user_id = auth.uid();
  
  -- Insert the action log
  INSERT INTO public.admin_actions (
    admin_id,
    action_type,
    target_type,
    target_id,
    description,
    metadata
  ) VALUES (
    v_admin_id,
    p_action_type,
    p_target_type,
    p_target_id,
    p_description,
    p_metadata
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION log_admin_action TO authenticated;

-- Create vendor_settings table
CREATE TABLE IF NOT EXISTS public.vendor_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  store_name text,
  store_description text,
  logo_url text,
  banner_url text,
  business_registration text,
  tax_number text,
  bank_account text,
  payment_methods jsonb DEFAULT '[]'::jsonb,
  shipping_zones jsonb DEFAULT '[]'::jsonb,
  minimum_order_amount numeric(10,2) DEFAULT 0,
  is_featured boolean DEFAULT false,
  is_verified boolean DEFAULT false,
  verified_at timestamp with time zone,
  verified_by uuid REFERENCES public.user_profiles(id),
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW(),
  CONSTRAINT vendor_settings_vendor_unique UNIQUE (vendor_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS vendor_settings_vendor_id_idx ON public.vendor_settings(vendor_id);
CREATE INDEX IF NOT EXISTS vendor_settings_is_featured_idx ON public.vendor_settings(is_featured) WHERE is_featured = true;

-- RLS for vendor_settings
ALTER TABLE public.vendor_settings ENABLE ROW LEVEL SECURITY;

-- Vendors can view and update their own settings
CREATE POLICY "Vendors can manage their settings" 
ON public.vendor_settings 
FOR ALL 
TO authenticated 
USING (
  vendor_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
);

-- Admins can view all vendor settings
CREATE POLICY "Admins can view all vendor settings" 
ON public.vendor_settings 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role IN ('admin', 'super_admin')
  )
);

-- Admins can update vendor settings (for verification)
CREATE POLICY "Admins can update vendor settings" 
ON public.vendor_settings 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role IN ('admin', 'super_admin')
  )
);

-- Create trigger for vendor_settings updated_at
CREATE TRIGGER update_vendor_settings_updated_at
  BEFORE UPDATE ON public.vendor_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();