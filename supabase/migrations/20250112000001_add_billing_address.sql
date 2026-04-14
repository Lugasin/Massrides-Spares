-- Add missing billing_address column to orders table
-- This fixes the 42703 error in VesicashPaymentMonitoring component

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'billing_address'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN billing_address jsonb;
    RAISE NOTICE 'Added billing_address column to orders table';
  ELSE
    RAISE NOTICE 'billing_address column already exists in orders table';
  END IF;
END $$;