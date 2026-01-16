-- Add order_number column to orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS order_number text;

-- Backfill order_number from order_reference or generate one
UPDATE orders 
SET order_number = COALESCE(order_reference, 'ORD-' || id::text)
WHERE order_number IS NULL;

-- Reload Schema
NOTIFY pgrst, 'reload schema';
