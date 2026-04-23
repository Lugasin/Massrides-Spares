-- Final Order Schema Alignment for Production Readiness
-- Ensures all columns required by the Orders page are present and correctly typed.

BEGIN;

-- 1. profiles: Ensure it exists (renaming user_profiles if standard)
-- In this project, 'profiles' is the standard table name.
-- We'll ensure it has the required columns.
ALTER TABLE IF EXISTS public.profiles 
    ADD COLUMN IF NOT EXISTS full_name text,
    ADD COLUMN IF NOT EXISTS phone text;

-- 2. orders: Add missing columns
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES auth.users(id),
    ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS shipping_address jsonb,
    ADD COLUMN IF NOT EXISTS billing_address jsonb;

-- 3. order_items: Ensure unit_price exists
ALTER TABLE public.order_items
    ADD COLUMN IF NOT EXISTS unit_price numeric(12,2);

-- Update unit_price from legacy price columns if needed
UPDATE public.order_items
    SET unit_price = COALESCE(unit_price, price, price_snapshot)
    WHERE unit_price IS NULL;

COMMIT;
