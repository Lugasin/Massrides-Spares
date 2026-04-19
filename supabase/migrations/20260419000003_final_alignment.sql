-- Final Alignment and Sync Migration
-- This script aligns schemas with Edge Function expectations and sets up sync triggers.

BEGIN;

-- 1. Align activity_logs with Edge Functions (action, metadata)
DO $$
BEGIN
    -- Rename activity_type to action if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_logs' AND column_name = 'activity_type') THEN
        ALTER TABLE public.activity_logs RENAME COLUMN activity_type TO action;
    END IF;
    
    -- Rename additional_details to metadata if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_logs' AND column_name = 'additional_details') THEN
        ALTER TABLE public.activity_logs RENAME COLUMN additional_details TO metadata;
    END IF;

    -- Add columns if they are missing entirely
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_logs' AND column_name = 'action') THEN
        ALTER TABLE public.activity_logs ADD COLUMN action text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_logs' AND column_name = 'metadata') THEN
        ALTER TABLE public.activity_logs ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 2. Ensure Inventory sync with Products
-- This trigger keeps the legacy 'inventory' table in sync with the new 'products.stock_quantity' field.

CREATE OR REPLACE FUNCTION sync_product_stock_to_inventory()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.inventory (product_id, vendor_id, quantity)
    VALUES (NEW.id, NEW.vendor_id, NEW.stock_quantity)
    ON CONFLICT (product_id) DO UPDATE
    SET quantity = EXCLUDED.quantity,
        updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_product_stock_to_inventory ON public.products;
CREATE TRIGGER trg_sync_product_stock_to_inventory
AFTER INSERT OR UPDATE OF stock_quantity ON public.products
FOR EACH ROW EXECUTE FUNCTION sync_product_stock_to_inventory();

-- Sync existing data
INSERT INTO public.inventory (product_id, vendor_id, quantity)
SELECT id, vendor_id, stock_quantity FROM public.products
ON CONFLICT (product_id) DO UPDATE
SET quantity = EXCLUDED.quantity;

-- 3. Fix user_profiles relationship for Activity Log
-- Ensure user_profiles.user_id is always in sync with id (already done but reinforcing)
UPDATE public.user_profiles SET user_id = id WHERE user_id IS NULL;

-- 4. Grant access to activity logs for admins
GRANT SELECT ON public.activity_logs TO authenticated;

COMMIT;
