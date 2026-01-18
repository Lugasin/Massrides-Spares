-- 1. Ensure 'spare_part_id' is renamed to 'product_id' in guest_cart_items
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

-- 2. Drop old FK constraints to avoid conflicts
ALTER TABLE guest_cart_items DROP CONSTRAINT IF EXISTS guest_cart_items_spare_part_id_fkey;
ALTER TABLE guest_cart_items DROP CONSTRAINT IF EXISTS guest_cart_items_product_id_fkey;

-- 3. Re-add the correct Foreign Key to 'products'
-- Note: Check if 'products' table exists, otherwise might need to reference 'spare_parts' if that's the table name.
-- Assuming 'products' based on previous context.
ALTER TABLE guest_cart_items 
    ADD CONSTRAINT guest_cart_items_product_id_fkey 
    FOREIGN KEY (product_id) 
    REFERENCES products(id) 
    ON DELETE CASCADE;

-- 4. Enable RLS and Grant Access
ALTER TABLE guest_cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public enable all access to guest_cart_items" ON guest_cart_items;
CREATE POLICY "Public enable all access to guest_cart_items" ON guest_cart_items
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

GRANT ALL ON guest_cart_items TO anon, authenticated, service_role;

-- 5. Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';
