-- Grant base table access permissions
-- RLS policies control WHICH rows are visible, but GRANT controls WHETHER the role can touch the table at all.

-- 📦 PRODUCTS: Public read access (browsing catalog without login)
GRANT SELECT ON products TO anon, authenticated;

-- 📂 CATEGORIES: Public read access (needed for product joins)
GRANT SELECT ON categories TO anon, authenticated;

-- 🛒 CARTS: Anon can create/read/update guest carts, authenticated can manage their own
GRANT SELECT, INSERT, UPDATE, DELETE ON carts TO anon, authenticated;

-- 👤 PROFILES: Authenticated users manage their own profile
GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
