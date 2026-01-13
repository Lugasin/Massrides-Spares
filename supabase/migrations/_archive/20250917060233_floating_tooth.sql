/*
  # Payment and Transaction System

  1. New Tables
    - `tj_transaction_logs` - Transaction Junction payment logs
    - `tj_payment_methods` - Saved payment methods with tokenization
    - `tj_security_logs` - Security events and fraud detection
    - `user_settings` - User preferences and configuration

  2. Security
    - Enable RLS on all payment tables
    - Add policies for user privacy and admin access
    - Implement security event logging

  3. Features
    - Complete Transaction Junction integration
    - Payment method tokenization and storage
    - Security monitoring and fraud detection
    - User preference management
*/

-- =====================================================
-- PAYMENT SYSTEM TABLES
-- =====================================================

-- Transaction Junction Transaction Logs
CREATE TABLE IF NOT EXISTS public.tj_transaction_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
    transaction_id text,
    payment_intent_id text,
    event_type text NOT NULL,
    status text,
    amount numeric(10,2),
    currency text DEFAULT 'USD',
    webhook_data jsonb DEFAULT '{}',
    processed_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now()
);

-- Transaction Junction Payment Methods
CREATE TABLE IF NOT EXISTS public.tj_payment_methods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    payment_method_token text NOT NULL,
    brand text,
    last4 text,
    exp_month integer,
    exp_year integer,
    tj_customer_id text,
    is_default boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Transaction Junction Security Logs
CREATE TABLE IF NOT EXISTS public.tj_security_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    event_type text NOT NULL,
    transaction_id text,
    risk_score integer DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 10),
    blocked boolean DEFAULT false,
    amount numeric(10,2),
    ip_address inet,
    user_agent text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz DEFAULT now()
);

-- User Settings Table
CREATE TABLE IF NOT EXISTS public.user_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    email_notifications boolean DEFAULT true,
    push_notifications boolean DEFAULT true,
    marketing_emails boolean DEFAULT false,
    order_updates boolean DEFAULT true,
    theme text DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    language text DEFAULT 'en',
    currency text DEFAULT 'USD',
    timezone text DEFAULT 'Africa/Lusaka',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- INDEXES FOR PAYMENT SYSTEM
-- =====================================================

-- TJ Transaction Logs Indexes
CREATE INDEX IF NOT EXISTS idx_tj_transaction_logs_order_id ON public.tj_transaction_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_tj_transaction_logs_transaction_id ON public.tj_transaction_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tj_transaction_logs_payment_intent_id ON public.tj_transaction_logs(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_tj_transaction_logs_event_type ON public.tj_transaction_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_tj_transaction_logs_status ON public.tj_transaction_logs(status);
CREATE INDEX IF NOT EXISTS idx_tj_transaction_logs_created_at ON public.tj_transaction_logs(created_at);

-- TJ Payment Methods Indexes
CREATE INDEX IF NOT EXISTS idx_tj_payment_methods_user_id ON public.tj_payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_tj_payment_methods_token ON public.tj_payment_methods(payment_method_token);
CREATE INDEX IF NOT EXISTS idx_tj_payment_methods_is_default ON public.tj_payment_methods(is_default);

-- TJ Security Logs Indexes
CREATE INDEX IF NOT EXISTS idx_tj_security_logs_user_id ON public.tj_security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_tj_security_logs_event_type ON public.tj_security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_tj_security_logs_risk_score ON public.tj_security_logs(risk_score);
CREATE INDEX IF NOT EXISTS idx_tj_security_logs_blocked ON public.tj_security_logs(blocked);
CREATE INDEX IF NOT EXISTS idx_tj_security_logs_created_at ON public.tj_security_logs(created_at);

-- User Settings Indexes
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.tj_transaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tj_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tj_security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- TJ Transaction Logs Policies
DROP POLICY IF EXISTS "Admins can read all transaction logs" ON public.tj_transaction_logs;
CREATE POLICY "Admins can read all transaction logs"
    ON public.tj_transaction_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid() 
            AND up.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "System can create transaction logs" ON public.tj_transaction_logs;
CREATE POLICY "System can create transaction logs"
    ON public.tj_transaction_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- TJ Payment Methods Policies
DROP POLICY IF EXISTS "Users can manage own payment methods" ON public.tj_payment_methods;
CREATE POLICY "Users can manage own payment methods"
    ON public.tj_payment_methods FOR ALL
    TO authenticated
    USING (
        user_id IN (
            SELECT id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- TJ Security Logs Policies
DROP POLICY IF EXISTS "Super admins can read security logs" ON public.tj_security_logs;
CREATE POLICY "Super admins can read security logs"
    ON public.tj_security_logs FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid() 
            AND up.role = 'super_admin'
        )
    );

DROP POLICY IF EXISTS "System can create security logs" ON public.tj_security_logs;
CREATE POLICY "System can create security logs"
    ON public.tj_security_logs FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- User Settings Policies
DROP POLICY IF EXISTS "Users can manage own settings" ON public.user_settings;
CREATE POLICY "Users can manage own settings"
    ON public.user_settings FOR ALL
    TO authenticated
    USING (
        user_id IN (
            SELECT id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- =====================================================
-- PAYMENT SYSTEM FUNCTIONS
-- =====================================================

-- Function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
    p_event_type text,
    p_user_id uuid DEFAULT NULL,
    p_transaction_id text DEFAULT NULL,
    p_risk_score integer DEFAULT 0,
    p_blocked boolean DEFAULT false,
    p_amount numeric DEFAULT NULL,
    p_ip_address inet DEFAULT NULL,
    p_user_agent text DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    log_id uuid;
BEGIN
    INSERT INTO public.tj_security_logs (
        user_id,
        event_type,
        transaction_id,
        risk_score,
        blocked,
        amount,
        ip_address,
        user_agent,
        metadata
    ) VALUES (
        p_user_id,
        p_event_type,
        p_transaction_id,
        p_risk_score,
        p_blocked,
        p_amount,
        p_ip_address,
        p_user_agent,
        p_metadata
    ) RETURNING id INTO log_id;
    
    RETURN log_id;
END;
$$;

-- Function to record system metrics
CREATE OR REPLACE FUNCTION public.record_metric(
    p_metric_name text,
    p_metric_value numeric,
    p_metric_unit text DEFAULT NULL,
    p_tags jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    metric_id uuid;
BEGIN
    INSERT INTO public.system_metrics (
        metric_name,
        metric_value,
        metric_unit,
        tags
    ) VALUES (
        p_metric_name,
        p_metric_value,
        p_metric_unit,
        p_tags
    ) RETURNING id INTO metric_id;
    
    RETURN metric_id;
END;
$$;

-- =====================================================
-- TRIGGERS FOR PAYMENT AUTOMATION
-- =====================================================

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_tj_payment_methods_updated_at ON public.tj_payment_methods;
CREATE TRIGGER update_tj_payment_methods_updated_at
    BEFORE UPDATE ON public.tj_payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to ensure only one default payment method per user
CREATE OR REPLACE FUNCTION public.ensure_single_default_payment_method()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.is_default = true THEN
        UPDATE public.tj_payment_methods
        SET is_default = false
        WHERE user_id = NEW.user_id AND id != NEW.id;
    END IF;
    RETURN NEW;
END;
$$;

-- Trigger to ensure single default payment method
DROP TRIGGER IF EXISTS ensure_single_default_payment_method ON public.tj_payment_methods;
CREATE TRIGGER ensure_single_default_payment_method
    BEFORE INSERT OR UPDATE ON public.tj_payment_methods
    FOR EACH ROW
    EXECUTE FUNCTION public.ensure_single_default_payment_method();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.tj_transaction_logs IS 'Transaction Junction payment transaction logs';
COMMENT ON TABLE public.tj_payment_methods IS 'Tokenized payment methods for users';
COMMENT ON TABLE public.tj_security_logs IS 'Security events and fraud detection logs';
COMMENT ON TABLE public.user_settings IS 'User preferences and configuration settings';

COMMENT ON FUNCTION public.log_security_event IS 'Logs security events with risk scoring';
COMMENT ON FUNCTION public.record_metric IS 'Records system performance metrics';
COMMENT ON FUNCTION public.ensure_single_default_payment_method IS 'Ensures only one default payment method per user';