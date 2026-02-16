/*
  # Complete Transaction Junction Integration

  1. Payment Tables
    - tj_transaction_logs: Complete transaction audit trail
    - tj_payment_methods: Saved payment method tokens
    - tj_security_logs: Security event logging

  2. Order Updates
    - Add tj jsonb column for TJ-specific data
    - Add payment method references
    - Add TJ transaction tracking

  3. Security Functions
    - log_security_event(): Log security events with risk scoring
    - record_metric(): Record system performance metrics

  4. Payment Status Management
    - Proper status constraints
    - Audit logging for payment events
    - Real-time updates for payment status changes
*/

-- Add TJ column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tj jsonb;

-- Create TJ transaction logs table
CREATE TABLE IF NOT EXISTS tj_transaction_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  transaction_id text,
  session_id text,
  payment_intent_id text,
  event_type text NOT NULL DEFAULT 'webhook_received',
  amount numeric(10,2),
  currency text DEFAULT 'USD',
  status text,
  webhook_data jsonb,
  processed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for TJ transaction logs
CREATE INDEX IF NOT EXISTS idx_tj_transaction_logs_transaction_id ON tj_transaction_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tj_transaction_logs_order_id ON tj_transaction_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_tj_transaction_logs_session_id ON tj_transaction_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_tj_transaction_logs_created_at ON tj_transaction_logs(created_at DESC);

-- Create TJ payment methods table
CREATE TABLE IF NOT EXISTS tj_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  payment_method_token text NOT NULL,
  brand text,
  last4 text,
  exp_month integer,
  exp_year integer,
  is_default boolean DEFAULT false,
  tj_customer_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for payment methods
CREATE INDEX IF NOT EXISTS idx_tj_payment_methods_user_id ON tj_payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_tj_payment_methods_token ON tj_payment_methods(payment_method_token);

-- Create TJ security logs table
CREATE TABLE IF NOT EXISTS tj_security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  transaction_id text,
  amount numeric(10,2),
  risk_score integer DEFAULT 0,
  blocked boolean DEFAULT false,
  ip_address inet,
  user_agent text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for security logs
CREATE INDEX IF NOT EXISTS idx_tj_security_logs_event_type ON tj_security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_tj_security_logs_risk_score ON tj_security_logs(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_tj_security_logs_created_at ON tj_security_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tj_security_logs_user_id ON tj_security_logs(user_id);

-- Create log_security_event function
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_user_id uuid DEFAULT NULL,
  p_transaction_id text DEFAULT NULL,
  p_amount numeric DEFAULT NULL,
  p_risk_score integer DEFAULT 0,
  p_blocked boolean DEFAULT false,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO tj_security_logs (
    event_type,
    user_id,
    transaction_id,
    amount,
    risk_score,
    blocked,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    p_event_type,
    p_user_id,
    p_transaction_id,
    p_amount,
    p_risk_score,
    p_blocked,
    p_ip_address,
    p_user_agent,
    p_metadata
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Create record_metric function
CREATE OR REPLACE FUNCTION public.record_metric(
  p_metric_name text,
  p_metric_value numeric,
  p_metric_unit text DEFAULT 'count',
  p_tags jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  metric_id uuid;
BEGIN
  INSERT INTO system_metrics (
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

-- Add payment status constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'orders' AND constraint_name = 'valid_payment_status'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT valid_payment_status 
    CHECK (payment_status IN ('pending', 'processing', 'paid', 'failed', 'refunded', 'authorised', 'settled', 'cancelled'));
  END IF;
END $$;

-- Add order status constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'orders' AND constraint_name = 'valid_order_status'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT valid_order_status 
    CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'failed', 'pending_payment'));
  END IF;
END $$;

-- Enable RLS on new tables
ALTER TABLE tj_transaction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tj_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE tj_security_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for TJ tables
CREATE POLICY "Admins can view all transaction logs"
  ON tj_transaction_logs
  FOR SELECT
  TO authenticated
  USING (has_role('admin') OR has_role('super_admin'));

CREATE POLICY "Users can view their own payment methods"
  ON tj_payment_methods
  FOR ALL
  TO authenticated
  USING (user_id = (SELECT id FROM user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Super admins can view security logs"
  ON tj_security_logs
  FOR SELECT
  TO authenticated
  USING (has_role('super_admin'));

-- Add realtime for TJ tables
ALTER PUBLICATION supabase_realtime ADD TABLE tj_transaction_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE tj_payment_methods;
ALTER PUBLICATION supabase_realtime ADD TABLE tj_security_logs;