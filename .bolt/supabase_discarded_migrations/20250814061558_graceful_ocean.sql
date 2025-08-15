/*
  # Update orders table for Transaction Junction integration

  1. Table Updates
    - Add `tj` JSONB column to orders table for TJ session data
    - Ensure all required columns exist

  2. Indexes
    - Add indexes for TJ-related queries

  3. Security
    - Maintain existing RLS policies
*/

-- Add tj column to orders table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'tj'
  ) THEN
    ALTER TABLE orders ADD COLUMN tj jsonb;
  END IF;
END $$;

-- Add indexes for TJ-related queries
CREATE INDEX IF NOT EXISTS idx_orders_payment_intent_id ON orders(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_session_id ON orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);

-- Ensure order_number is unique if not already
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_order_number_key'
  ) THEN
    ALTER TABLE orders ADD CONSTRAINT orders_order_number_key UNIQUE (order_number);
  END IF;
END $$;