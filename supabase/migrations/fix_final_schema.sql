-- Rename spare_part_id to product_id for consistency and automatic PostgREST join detection
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'guest_cart_items' 
        AND column_name = 'spare_part_id'
    ) THEN
        ALTER TABLE guest_cart_items RENAME COLUMN spare_part_id TO product_id;
    END IF;
END $$;

-- Drop old FK if it exists
ALTER TABLE guest_cart_items DROP CONSTRAINT IF EXISTS guest_cart_items_spare_part_id_fkey;

-- Ensure new FK exists and points to products
-- We use standard naming so PostgREST picks up 'product' relation automatically
ALTER TABLE guest_cart_items DROP CONSTRAINT IF EXISTS guest_cart_items_product_id_fkey;

ALTER TABLE guest_cart_items 
    ADD CONSTRAINT guest_cart_items_product_id_fkey 
    FOREIGN KEY (product_id) 
    REFERENCES products(id) 
    ON DELETE CASCADE;

-- Reload Schema Cache
NOTIFY pgrst, 'reload schema';
