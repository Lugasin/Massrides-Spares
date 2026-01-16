-- Add shipping_address column to orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shipping_address jsonb DEFAULT '{}'::jsonb;

-- Also ensure billing_address exists as it is standard
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS billing_address jsonb DEFAULT '{}'::jsonb;

-- Reload Schema
NOTIFY pgrst, 'reload schema';
