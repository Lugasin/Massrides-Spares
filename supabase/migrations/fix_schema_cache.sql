-- Force creation of guest_cart_items if missing
CREATE TABLE IF NOT EXISTS guest_cart_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    guest_cart_id uuid REFERENCES guest_carts(id) ON DELETE CASCADE,
    spare_part_id bigint REFERENCES products(id) ON DELETE CASCADE, 
    quantity integer DEFAULT 1,
    added_at timestamptz DEFAULT now()
);

-- Ensure RLS is on
ALTER TABLE guest_cart_items ENABLE ROW LEVEL SECURITY;

-- Ensure Policies exist (Drop to be safe)
DROP POLICY IF EXISTS "Public enable all access to guest_cart_items" ON guest_cart_items;
CREATE POLICY "Public enable all access to guest_cart_items" ON guest_cart_items
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

-- Ensure Permissions (Crucial for API visibility)
GRANT ALL ON guest_cart_items TO anon, authenticated, service_role;

-- Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';
