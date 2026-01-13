/*
  # Audit and Monitoring System

  1. New Tables
    - `activity_logs` - Comprehensive user activity tracking
    - `audit_logs` - Change tracking for critical tables
    - `system_metrics` - Performance and health metrics
    - `ads` - Vendor advertisements
    - `company_partners` - Partner company information

  2. Security
    - Enable RLS on audit tables
    - Add policies for admin access only
    - Implement audit triggers for critical tables

  3. Features
    - Complete audit trail for compliance
    - System performance monitoring
    - Vendor advertising system
    - Partner management
*/

-- =====================================================
-- AUDIT AND MONITORING TABLES
-- =====================================================

-- Activity Logs Table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id bigserial PRIMARY KEY,
    user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    user_email text,
    logged_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    activity_type text NOT NULL,
    resource_type text,
    resource_id bigint,
    additional_details jsonb DEFAULT '{}',
    ip_address text,
    user_agent text,
    risk_score integer DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    log_source text DEFAULT 'user_action',
    created_at timestamptz DEFAULT now()
);

-- Audit Logs Table for Change Tracking
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values jsonb,
    new_values jsonb,
    user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    ip_address text,
    user_agent text,
    created_at timestamptz DEFAULT now()
);

-- System Metrics Table
CREATE TABLE IF NOT EXISTS public.system_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name text NOT NULL,
    metric_value numeric NOT NULL,
    metric_unit text,
    tags jsonb DEFAULT '{}',
    recorded_at timestamptz DEFAULT now()
);

-- Ads Table for Vendor Advertisements
CREATE TABLE IF NOT EXISTS public.ads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    image_url text,
    target_url text,
    ad_type text DEFAULT 'banner' CHECK (ad_type IN ('banner', 'featured', 'sponsored')),
    start_date timestamptz DEFAULT now(),
    end_date timestamptz,
    impression_count integer DEFAULT 0,
    click_count integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Company Partners Table
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

-- =====================================================
-- INDEXES FOR AUDIT SYSTEM
-- =====================================================

-- Activity Logs Indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_activity_type ON public.activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_type ON public.activity_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_id ON public.activity_logs(resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_risk_score ON public.activity_logs(risk_score);
CREATE INDEX IF NOT EXISTS idx_activity_logs_log_source ON public.activity_logs(log_source);

-- Audit Logs Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON public.audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- System Metrics Indexes
CREATE INDEX IF NOT EXISTS idx_system_metrics_metric_name ON public.system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON public.system_metrics(recorded_at);

-- Ads Indexes
CREATE INDEX IF NOT EXISTS idx_ads_vendor_id ON public.ads(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ads_ad_type ON public.ads(ad_type);
CREATE INDEX IF NOT EXISTS idx_ads_is_active ON public.ads(is_active);
CREATE INDEX IF NOT EXISTS idx_ads_start_date ON public.ads(start_date);
CREATE INDEX IF NOT EXISTS idx_ads_end_date ON public.ads(end_date);

-- Company Partners Indexes
CREATE INDEX IF NOT EXISTS idx_company_partners_display_order ON public.company_partners(display_order);
CREATE INDEX IF NOT EXISTS idx_company_partners_is_active ON public.company_partners(is_active);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_partners ENABLE ROW LEVEL SECURITY;

-- Activity Logs Policies
DROP POLICY IF EXISTS "Admins can read all activity logs" ON public.activity_logs;
CREATE POLICY "Admins can read all activity logs"
    ON public.activity_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid() 
            AND up.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Users can read own activity logs" ON public.activity_logs;
CREATE POLICY "Users can read own activity logs"
    ON public.activity_logs FOR SELECT
    TO authenticated
    USING (
        user_id IN (
            SELECT id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "System can create activity logs" ON public.activity_logs;
CREATE POLICY "System can create activity logs"
    ON public.activity_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Audit Logs Policies (Super Admin only)
DROP POLICY IF EXISTS "Super admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Super admins can read audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid() 
            AND up.role = 'super_admin'
        )
    );

-- System Metrics Policies (Admin only)
DROP POLICY IF EXISTS "Admins can read system metrics" ON public.system_metrics;
CREATE POLICY "Admins can read system metrics"
    ON public.system_metrics FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid() 
            AND up.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "System can create metrics" ON public.system_metrics;
CREATE POLICY "System can create metrics"
    ON public.system_metrics FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Ads Policies
DROP POLICY IF EXISTS "Anyone can read active ads" ON public.ads;
CREATE POLICY "Anyone can read active ads"
    ON public.ads FOR SELECT
    TO anon, authenticated
    USING (is_active = true AND (end_date IS NULL OR end_date > now()));

DROP POLICY IF EXISTS "Vendors can manage own ads" ON public.ads;
CREATE POLICY "Vendors can manage own ads"
    ON public.ads FOR ALL
    TO authenticated
    USING (
        vendor_id IN (
            SELECT id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage all ads" ON public.ads;
CREATE POLICY "Admins can manage all ads"
    ON public.ads FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid() 
            AND up.role IN ('admin', 'super_admin')
        )
    );

-- Company Partners Policies
DROP POLICY IF EXISTS "Anyone can read active partners" ON public.company_partners;
CREATE POLICY "Anyone can read active partners"
    ON public.company_partners FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage partners" ON public.company_partners;
CREATE POLICY "Admins can manage partners"
    ON public.company_partners FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid() 
            AND up.role IN ('admin', 'super_admin')
        )
    );

-- =====================================================
-- AUDIT TRIGGERS FOR CRITICAL TABLES
-- =====================================================

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_profile_id uuid;
    client_ip text;
    client_user_agent text;
BEGIN
    -- Get current user profile ID
    SELECT id INTO user_profile_id 
    FROM public.user_profiles 
    WHERE user_id = auth.uid();
    
    -- Get client info from current_setting (set by application)
    client_ip := current_setting('app.client_ip', true);
    client_user_agent := current_setting('app.user_agent', true);
    
    INSERT INTO public.audit_logs (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        user_id,
        ip_address,
        user_agent
    ) VALUES (
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        TG_OP,
        CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
        user_profile_id,
        client_ip,
        client_user_agent
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add audit triggers to critical tables
DROP TRIGGER IF EXISTS audit_user_profiles ON public.user_profiles;
CREATE TRIGGER audit_user_profiles
    AFTER INSERT OR UPDATE OR DELETE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_spare_parts ON public.spare_parts;
CREATE TRIGGER audit_spare_parts
    AFTER INSERT OR UPDATE OR DELETE ON public.spare_parts
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger();

DROP TRIGGER IF EXISTS audit_orders ON public.orders;
CREATE TRIGGER audit_orders
    AFTER INSERT OR UPDATE OR DELETE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_trigger();

-- =====================================================
-- TRIGGERS FOR AUTOMATION
-- =====================================================

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_ads_updated_at ON public.ads;
CREATE TRIGGER update_ads_updated_at
    BEFORE UPDATE ON public.ads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_partners_updated_at ON public.company_partners;
CREATE TRIGGER update_company_partners_updated_at
    BEFORE UPDATE ON public.company_partners
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.activity_logs IS 'Comprehensive user activity tracking with risk scoring';
COMMENT ON TABLE public.audit_logs IS 'Change tracking for critical tables for compliance';
COMMENT ON TABLE public.system_metrics IS 'System performance and health metrics';
COMMENT ON TABLE public.ads IS 'Vendor advertisements and promotional content';
COMMENT ON TABLE public.company_partners IS 'Partner company information for display';

COMMENT ON FUNCTION public.audit_trigger IS 'Generic audit trigger for tracking changes to critical tables';