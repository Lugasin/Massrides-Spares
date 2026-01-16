-- Add total_amount column (missing in schema, expected by backend)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS total_amount numeric;

-- Backfill total_amount from total
UPDATE orders 
SET total_amount = total 
WHERE total_amount IS NULL;

-- Ensure shipping_address exists
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS shipping_address jsonb DEFAULT '{}'::jsonb;

-- Ensure billing_address exists
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS billing_address jsonb DEFAULT '{}'::jsonb;

-- Reload Schema
NOTIFY pgrst, 'reload schema';
