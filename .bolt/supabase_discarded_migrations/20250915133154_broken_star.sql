/*
  # Add Missing Tables for Complete PWA Functionality
  
  1. Tables
    - system_metrics for performance monitoring
    - ads for vendor advertisements
    - company_partners for partner carousel
    - audit_logs for system audit trail
    
  2. Security
    - Enable RLS on all new tables
    - Add appropriate access policies
    
  3. Performance
    - Add necessary indexes
*/

-- Create system_metrics table
CREATE TABLE IF NOT EXISTS public.system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_unit text,
  tags jsonb DEFAULT '{}',
  recorded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_name_time ON public.system_metrics(metric_name, recorded_at);

-- Create ads table
CREATE TABLE IF NOT EXISTS public.ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text,
  target_url text,
  ad_type text DEFAULT 'banner' CHECK (ad_type IN ('banner', 'featured', 'sidebar')),
  is_active boolean DEFAULT true,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  click_count integer DEFAULT 0,
  impression_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ads_vendor_id ON public.ads(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ads_active ON public.ads(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ads_type ON public.ads(ad_type);

-- Create company_partners table
CREATE TABLE IF NOT EXISTS public.company_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  website_url text,
  description text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_partners_display_order ON public.company_partners(display_order);
CREATE INDEX IF NOT EXISTS idx_company_partners_active ON public.company_partners(is_active) WHERE is_active = true;

-- Insert default company partners
INSERT INTO public.company_partners (name, logo_url, website_url, description, display_order) VALUES
  ('John Deere', '/company logos/John_Deere-Logo-PNG3.png', 'https://www.deere.com', 'Leading agricultural equipment manufacturer', 1),
  ('Case IH', '/company logos/IH_logo_PNG_(3).png', 'https://www.caseih.com', 'Agricultural and construction equipment', 2),
  ('New Holland', '/company logos/New_Holland_logo_PNG_(7).png', 'https://www.newholland.com', 'Agricultural machinery and equipment', 3),
  ('Kubota', '/company logos/Kubota_(1).png', 'https://www.kubota.com', 'Compact tractors and equipment', 4),
  ('Massey Ferguson', '/company logos/Massey-Ferguson-Logo.png', 'https://www.masseyferguson.com', 'Agricultural equipment and tractors', 5)
ON CONFLICT (name) DO NOTHING;

-- Create audit_logs table (separate from activity_logs for system auditing)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text,
  record_id text,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);

-- Enable RLS on new tables
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for system_metrics (admin only)
CREATE POLICY "Admins can view system metrics" ON public.system_metrics
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- RLS policies for ads
CREATE POLICY "Anyone can view active ads" ON public.ads
FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "Vendors can manage their ads" ON public.ads
FOR ALL USING (
  vendor_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can manage all ads" ON public.ads
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- RLS policies for company_partners
CREATE POLICY "Anyone can view active partners" ON public.company_partners
FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY "Admins can manage partners" ON public.company_partners
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- RLS policies for audit_logs (admin only)
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.ads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.company_partners;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_metrics;