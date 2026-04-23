-- Renaming price_snapshot to unit_price for production readiness alignment
-- The frontend is being updated to use unit_price as the standard field name.

BEGIN;

-- 1. order_items: Add unit_price as the new standard
ALTER TABLE public.order_items 
    ADD COLUMN IF NOT EXISTS unit_price numeric(12,2);

-- 2. Backfill unit_price from price_snapshot or price
UPDATE public.order_items 
    SET unit_price = COALESCE(price_snapshot, price)
    WHERE unit_price IS NULL AND (price_snapshot IS NOT NULL OR price IS NOT NULL);

-- 3. Synchronize price_snapshot with unit_price for backward compatibility (in case some old code remains)
-- (We keep price_snapshot for now just to avoid breaking any other components during transition)
UPDATE public.order_items 
    SET price_snapshot = unit_price
    WHERE price_snapshot IS NULL AND unit_price IS NOT NULL;

COMMIT;
