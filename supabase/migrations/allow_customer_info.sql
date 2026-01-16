-- Fix: Add missing customer_info column to orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_info jsonb DEFAULT '{}'::jsonb;
