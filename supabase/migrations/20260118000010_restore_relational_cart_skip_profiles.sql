-- Restore Relational Cart Schema to match Frontend Code
-- RETRY 2: SKIP user_profiles View creation to avoid conflicts.
-- We assume user_profiles exists or we will fix it separately.

BEGIN;

-- 1. [SKIPPED] user_profiles View manipulation
-- (Leaving existing state alone to prevent DROP errors)

-- 2. Ensure 'carts' table exists
CREATE TABLE IF NOT EXISTS carts (
  id bigserial primary key,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

-- 3. Restore 'cart_items'
CREATE TABLE IF NOT EXISTS cart_items (
  id bigserial primary key,
  cart_id bigint references carts(id) on delete cascade,
  product_id bigint references products(id) on delete cascade,
  quantity integer default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  UNIQUE(cart_id, product_id)
);
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- 4. Create 'guest_carts'
CREATE TABLE IF NOT EXISTS guest_carts (
  id bigserial primary key,
  session_id text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
ALTER TABLE guest_carts ENABLE ROW LEVEL SECURITY;

-- 5. Create 'guest_cart_items'
CREATE TABLE IF NOT EXISTS guest_cart_items (
  id bigserial primary key,
  guest_cart_id bigint references guest_carts(id) on delete cascade,
  product_id bigint references products(id) on delete cascade,
  quantity integer default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  UNIQUE(guest_cart_id, product_id)
);
ALTER TABLE guest_cart_items ENABLE ROW LEVEL SECURITY;


-- 6. RLS POLICIES

-- CARTS
DROP POLICY IF EXISTS "Users can manage own cart" ON carts;
DROP POLICY IF EXISTS "Users can select own cart" ON carts;
DROP POLICY IF EXISTS "Users can insert own cart" ON carts;
DROP POLICY IF EXISTS "Users can update own cart" ON carts;
DROP POLICY IF EXISTS "Users can delete own cart" ON carts;

CREATE POLICY "Users can select own cart" ON carts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cart" ON carts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cart" ON carts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cart" ON carts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- CART_ITEMS
DROP POLICY IF EXISTS "Users can manage own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can view own cart items" ON cart_items;

CREATE POLICY "Users can view own cart items" ON cart_items FOR SELECT TO authenticated
USING ( EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()) );

CREATE POLICY "Users can insert own cart items" ON cart_items FOR INSERT TO authenticated
WITH CHECK ( EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()) );

CREATE POLICY "Users can update own cart items" ON cart_items FOR UPDATE TO authenticated
USING ( EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()) );

CREATE POLICY "Users can delete own cart items" ON cart_items FOR DELETE TO authenticated
USING ( EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()) );


-- GUEST CARTS
DROP POLICY IF EXISTS "Guests can manage own cart" ON guest_carts;

CREATE POLICY "Guests can select cart" ON guest_carts FOR SELECT USING (session_id IS NOT NULL);
CREATE POLICY "Guests can insert cart" ON guest_carts FOR INSERT WITH CHECK (session_id IS NOT NULL);
CREATE POLICY "Guests can update cart" ON guest_carts FOR UPDATE USING (session_id IS NOT NULL);
CREATE POLICY "Guests can delete cart" ON guest_carts FOR DELETE USING (session_id IS NOT NULL);

-- GUEST CART ITEMS
DROP POLICY IF EXISTS "Guests can manage own cart items" ON guest_cart_items;

CREATE POLICY "Guests can select items" ON guest_cart_items FOR SELECT
USING ( EXISTS (SELECT 1 FROM guest_carts WHERE guest_carts.id = guest_cart_items.guest_cart_id AND guest_carts.session_id IS NOT NULL) );

CREATE POLICY "Guests can insert items" ON guest_cart_items FOR INSERT
WITH CHECK ( EXISTS (SELECT 1 FROM guest_carts WHERE guest_carts.id = guest_cart_items.guest_cart_id AND guest_carts.session_id IS NOT NULL) );

CREATE POLICY "Guests can update items" ON guest_cart_items FOR UPDATE
USING ( EXISTS (SELECT 1 FROM guest_carts WHERE guest_carts.id = guest_cart_items.guest_cart_id AND guest_carts.session_id IS NOT NULL) );

CREATE POLICY "Guests can delete items" ON guest_cart_items FOR DELETE
USING ( EXISTS (SELECT 1 FROM guest_carts WHERE guest_carts.id = guest_cart_items.guest_cart_id AND guest_carts.session_id IS NOT NULL) );

COMMIT;
