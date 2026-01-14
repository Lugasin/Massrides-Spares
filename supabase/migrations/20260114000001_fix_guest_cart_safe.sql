-- Enable RLS (safe to run multiple times)
ALTER TABLE guest_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_cart_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow anon access to guest_carts" ON guest_carts;
DROP POLICY IF EXISTS "Allow anon access to guest_cart_items" ON guest_cart_items;

-- Re-create policies
CREATE POLICY "Allow anon access to guest_carts"
ON guest_carts
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anon access to guest_cart_items"
ON guest_cart_items
FOR ALL
TO anon
USING (true)
WITH CHECK (true);

-- Grant permissions (safe to run multiple times)
GRANT ALL ON guest_carts TO anon;
GRANT ALL ON guest_cart_items TO anon;
