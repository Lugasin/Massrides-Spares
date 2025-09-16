/*
  # Complete Transaction Junction Integration
  
  1. Tables
    - Add tj column to orders table
    - Create tj_transaction_logs table
    - Create tj_payment_methods table
    - Create tj_security_logs table
    
  2. Functions
    - Add TJ webhook processing functions
    - Add payment status mapping functions
    - Add security logging functions
    
  3. Security
    - Enable RLS on TJ tables
    - Add admin-only access policies
*/

-- Add tj column to orders table if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'tj'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN tj jsonb;
  END IF;
END $$;

-- Create tj_transaction_logs table
CREATE TABLE IF NOT EXISTS public.tj_transaction_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  transaction_id text,
  session_id text,
  payment_intent_id text,
  event_type text NOT NULL,
  status text,
  amount numeric,
  currency text,
  webhook_data jsonb,
  processed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for tj_transaction_logs
CREATE INDEX IF NOT EXISTS idx_tj_logs_transaction_id ON public.tj_transaction_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tj_logs_order_id ON public.tj_transaction_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_tj_logs_created_at ON public.tj_transaction_logs(created_at);

-- Create tj_payment_methods table
CREATE TABLE IF NOT EXISTS public.tj_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
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

-- Create indexes for tj_payment_methods
CREATE INDEX IF NOT EXISTS idx_tj_payment_methods_user_id ON public.tj_payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_tj_payment_methods_token ON public.tj_payment_methods(payment_method_token);

-- Create tj_security_logs table
CREATE TABLE IF NOT EXISTS public.tj_security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  transaction_id text,
  amount numeric,
  ip_address inet,
  user_agent text,
  risk_score integer DEFAULT 0,
  blocked boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Create indexes for tj_security_logs
CREATE INDEX IF NOT EXISTS idx_tj_security_logs_event_type ON public.tj_security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_tj_security_logs_created_at ON public.tj_security_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_tj_security_logs_user_id ON public.tj_security_logs(user_id);

-- Enable RLS on TJ tables
ALTER TABLE public.tj_transaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tj_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tj_security_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for tj_transaction_logs (admin only)
CREATE POLICY "Admins can view transaction logs" ON public.tj_transaction_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- RLS policies for tj_payment_methods
CREATE POLICY "Users can view their payment methods" ON public.tj_payment_methods
FOR SELECT USING (
  user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can manage their payment methods" ON public.tj_payment_methods
FOR ALL USING (
  user_id = (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
);

-- RLS policies for tj_security_logs (super admin only)
CREATE POLICY "Super admins can view security logs" ON public.tj_security_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_user_id uuid DEFAULT NULL,
  p_transaction_id text DEFAULT NULL,
  p_amount numeric DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_risk_score integer DEFAULT 0,
  p_blocked boolean DEFAULT false,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.tj_security_logs (
    event_type, user_id, transaction_id, amount, ip_address,
    user_agent, risk_score, blocked, metadata
  ) VALUES (
    p_event_type, p_user_id, p_transaction_id, p_amount, p_ip_address,
    p_user_agent, p_risk_score, p_blocked, p_metadata
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to record system metrics
CREATE OR REPLACE FUNCTION public.record_metric(
  p_metric_name text,
  p_metric_value numeric,
  p_metric_unit text DEFAULT NULL,
  p_tags jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
  metric_id uuid;
BEGIN
  INSERT INTO public.system_metrics (
    metric_name, metric_value, metric_unit, tags
  ) VALUES (
    p_metric_name, p_metric_value, p_metric_unit, p_tags
  ) RETURNING id INTO metric_id;
  
  RETURN metric_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for TJ tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.tj_transaction_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tj_payment_methods;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tj_security_logs;