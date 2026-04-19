-- Migration: Add billing_address to orders table
-- Fix for VesicashPaymentMonitoring column mismatch error (42703)

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS billing_address JSONB DEFAULT NULL;

-- Also add missing columns that may be referenced in queries
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN public.orders.billing_address IS 'Billing address JSON - separate from shipping address';