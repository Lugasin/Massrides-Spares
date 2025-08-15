/*
  # Create Transaction Junction transaction logs table

  1. New Tables
    - `tj_transaction_logs` - Store all TJ webhook payloads and transaction data

  2. Security
    - Enable RLS on tj_transaction_logs table
    - Add policies for admin access only

  3. Indexes
    - Add indexes for efficient transaction lookup
*/

-- Create tj_transaction_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS tj_transaction_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  transaction_id text,
  session_id text,
  payment_intent_id text,
  payload jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_tj_transaction_id ON tj_transaction_logs(transaction_id);
CREATE INDEX IF NOT EXISTS idx_tj_session_id ON tj_transaction_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_tj_payment_intent_id ON tj_transaction_logs(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_tj_order_id ON tj_transaction_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_tj_created_at ON tj_transaction_logs(created_at DESC);

-- Enable RLS
ALTER TABLE tj_transaction_logs ENABLE ROW LEVEL SECURITY;

-- Policies for TJ transaction logs
CREATE POLICY "Admins can view all TJ logs"
  ON tj_transaction_logs
  FOR SELECT
  TO authenticated
  USING (has_role(uid(), 'admin'::app_role) OR has_role(uid(), 'super_admin'::app_role));

CREATE POLICY "System can insert TJ logs"
  ON tj_transaction_logs
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);