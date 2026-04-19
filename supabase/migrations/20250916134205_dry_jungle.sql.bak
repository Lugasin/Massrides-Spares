/*
  # Add Missing Tables for Complete PWA

  1. New Tables
    - audit_logs: Comprehensive audit trail for all operations
    - system_metrics: System performance and health metrics
    - ads: Vendor advertisement management
    - company_partners: Partner company information

  2. Security
    - Enable RLS on all new tables
    - Add appropriate policies for each user role
    - Add audit triggers where needed

  3. Performance
    - Add indexes for all new tables
    - Enable realtime subscriptions
*/

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id text,
  action text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Create system_metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_unit text DEFAULT 'count',
  tags jsonb DEFAULT '{}'::jsonb,
  recorded_at timestamptz DEFAULT now()
);

-- Create indexes for system_metrics
CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON system_metrics(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name_time ON system_metrics(metric_name, recorded_at DESC);

-- Create ads table for vendor advertisements
CREATE TABLE IF NOT EXISTS ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text,
  target_url text,
  ad_type text DEFAULT 'banner' CHECK (ad_type IN ('banner', 'featured', 'sidebar', 'popup')),
  is_active boolean DEFAULT true,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  impression_count integer DEFAULT 0,
  click_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for ads
CREATE INDEX IF NOT EXISTS idx_ads_vendor_id ON ads(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ads_is_active ON ads(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ads_ad_type ON ads(ad_type);
CREATE INDEX IF NOT EXISTS idx_ads_dates ON ads(start_date, end_date);

-- Create company_partners table
CREATE TABLE IF NOT EXISTS company_partners (
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

-- Create indexes for company_partners
CREATE INDEX IF NOT EXISTS idx_company_partners_display_order ON company_partners(display_order);
CREATE INDEX IF NOT EXISTS idx_company_partners_is_active ON company_partners(is_active) WHERE is_active = true;

-- Enable RLS on new tables
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_partners ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for audit_logs
CREATE POLICY "Users can view their own audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (has_role('admin') OR has_role('super_admin'));

-- Create RLS policies for system_metrics
CREATE POLICY "Admins can view system metrics"
  ON system_metrics
  FOR SELECT
  TO authenticated
  USING (has_role('admin') OR has_role('super_admin'));

CREATE POLICY "Service role can insert metrics"
  ON system_metrics
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Create RLS policies for ads
CREATE POLICY "Everyone can view active ads"
  ON ads
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND (start_date IS NULL OR start_date <= now()) AND (end_date IS NULL OR end_date >= now()));

CREATE POLICY "Vendors can manage their own ads"
  ON ads
  FOR ALL
  TO authenticated
  USING (vendor_id = (SELECT id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all ads"
  ON ads
  FOR ALL
  TO authenticated
  USING (has_role('admin') OR has_role('super_admin'));

-- Create RLS policies for company_partners
CREATE POLICY "Everyone can view active partners"
  ON company_partners
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage partners"
  ON company_partners
  FOR ALL
  TO authenticated
  USING (has_role('admin') OR has_role('super_admin'));

-- Add realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE system_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE ads;
ALTER PUBLICATION supabase_realtime ADD TABLE company_partners;

-- Create update triggers for updated_at columns
CREATE TRIGGER update_ads_updated_at
  BEFORE UPDATE ON ads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_partners_updated_at
  BEFORE UPDATE ON company_partners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tj_payment_methods_updated_at
  BEFORE UPDATE ON tj_payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();