-- Grant usage on schema public
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Make sure RLS is enabled generally, but for now we grant wide access to debug
-- Refine these later for production!

-- Enable RLS (idempotent usually, but good to be explicit if we want policies)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- Create basic read policies if they don't exist
-- We effectively granted ALL above, but RLS restricts it back down if enabled.
-- If RLS is enabled, we need policies.

-- Products: Everyone can read active products/inventory
DROP POLICY IF EXISTS "Public read access" ON products;
CREATE POLICY "Public read access" ON products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access" ON categories;
CREATE POLICY "Public read access" ON categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read access" ON inventory;
CREATE POLICY "Public read access" ON inventory FOR SELECT USING (true);

-- Carts: Users can see their own, Guests can see theirs (handled by app logic usually, but here we open RLS for now to fix connection)
-- Note: 'GRANT ALL' allows the query to RUN, RLS filters the rows.

-- Guest Carts allow public insert/update (logic handles session_id match)
ALTER TABLE guest_carts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Guest public access" ON guest_carts;
CREATE POLICY "Guest public access" ON guest_carts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE guest_cart_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Guest items public access" ON guest_cart_items;
CREATE POLICY "Guest items public access" ON guest_cart_items FOR ALL USING (true) WITH CHECK (true);

-- Force cache reload
NOTIFY pgrst, 'reload schema';
