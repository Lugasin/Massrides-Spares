-- Fix Orders page 400 errors
-- The frontend queries columns that don't exist in the current schema.
-- Rather than changing the frontend, we align the DB to match.

BEGIN;

-- 1. orders: missing vendor_id
ALTER TABLE public.orders
    ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES auth.users(id);

-- 2. order_items: missing price_snapshot (alias for price)
ALTER TABLE public.order_items
    ADD COLUMN IF NOT EXISTS price_snapshot numeric(12,2);

-- Backfill price_snapshot from the existing price column
UPDATE public.order_items
    SET price_snapshot = price
    WHERE price_snapshot IS NULL AND price IS NOT NULL;

-- 3. products: missing name column (frontend queries name, DB has title)
ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS name text;

-- Backfill name from title
UPDATE public.products
    SET name = title
    WHERE name IS NULL AND title IS NOT NULL;

-- Keep name in sync with title via trigger
CREATE OR REPLACE FUNCTION public.sync_product_name()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.title IS DISTINCT FROM OLD.title THEN
        NEW.name := NEW.title;
    END IF;
    IF NEW.name IS DISTINCT FROM OLD.name AND NEW.title = OLD.title THEN
        NEW.title := NEW.name;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_name ON public.products;
CREATE TRIGGER trg_sync_product_name
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.sync_product_name();

-- 4. payments: missing completed_at
ALTER TABLE public.payments
    ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;

COMMIT;
