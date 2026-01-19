-- MASTER FIX: Cart/CartItems RLS & Permissions
-- This script consolidates ALL necessary fixes for Cart functionality.
-- RUN THIS IF YOU HAVE "403 Forbidden" or "Items Disappear" or "409 Conflict"

BEGIN;

-- 1. FIX: Ensure carts.user_id references auth.users
ALTER TABLE carts DROP CONSTRAINT IF EXISTS carts_user_id_fkey;
ALTER TABLE carts 
  ADD CONSTRAINT carts_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. FIX: Uniqueness (One Cart Per User)
DROP INDEX IF EXISTS one_cart_per_user;
CREATE UNIQUE INDEX one_cart_per_user ON carts(user_id) WHERE user_id IS NOT NULL;

-- 3. FIX: Enable RLS on both tables
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- 4. FIX: Carts RLS Policies (Drop old & Recreate)
DROP POLICY IF EXISTS "Users can select own cart" ON carts;
DROP POLICY IF EXISTS "Users can insert own cart" ON carts;
DROP POLICY IF EXISTS "Users can update own cart" ON carts;
DROP POLICY IF EXISTS "Users can delete own cart" ON carts;

CREATE POLICY "Users can select own cart" ON carts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cart" ON carts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cart" ON carts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cart" ON carts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. FIX: Cart Items RLS Policies (Check ownership via JOIN)
DROP POLICY IF EXISTS "Users can select own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can insert own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can update own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can delete own cart items" ON cart_items;

CREATE POLICY "Users can select own cart items" ON cart_items 
  FOR SELECT TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own cart items" ON cart_items 
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid())
  );

CREATE POLICY "Users can update own cart items" ON cart_items 
  FOR UPDATE TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid())
  );

CREATE POLICY "Users can delete own cart items" ON cart_items 
  FOR DELETE TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM carts WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid())
  );

-- 6. FIX: Grant basic permissions to authenticated role
GRANT ALL ON TABLE carts TO authenticated;
GRANT ALL ON TABLE cart_items TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE carts_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE cart_items_id_seq TO authenticated;

COMMIT;
