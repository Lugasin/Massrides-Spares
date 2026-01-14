-- Reset Carts Schema to match Code
DROP TABLE IF EXISTS cart_items CASCADE;
-- DROP TABLE IF EXISTS carts CASCADE; -- Safer to keep carts if it has other dependencies, but code assumes structure.
-- Actually, let's just make sure cart_items is fresh. Carts needs to be consistent too.
-- If carts exists from init, it has 'items jsonb'. Code ignores it and uses ID. That's fine.

-- Enable RLS on carts (safely)
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

-- Recreate cart_items
CREATE TABLE cart_items (
  id bigserial primary key,
  cart_id bigint references carts(id) on delete cascade,
  product_id bigint references products(id) on delete cascade,
  quantity integer default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Carts Policies
DROP POLICY IF EXISTS "Users can view their own cart" ON carts;
CREATE POLICY "Users can view their own cart" 
ON carts FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own cart" ON carts;
CREATE POLICY "Users can create their own cart" 
ON carts FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own cart" ON carts;
CREATE POLICY "Users can update their own cart" 
ON carts FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own cart" ON carts;
CREATE POLICY "Users can delete their own cart" 
ON carts FOR DELETE 
USING (auth.uid() = user_id);

-- Cart Items Policies
-- Inherit access from the parent cart
DROP POLICY IF EXISTS "Users can view their own cart items" ON cart_items;
CREATE POLICY "Users can view their own cart items" 
ON cart_items FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM carts 
    WHERE carts.id = cart_items.cart_id 
    AND carts.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert into their own cart" ON cart_items;
CREATE POLICY "Users can insert into their own cart" 
ON cart_items FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM carts 
    WHERE carts.id = cart_items.cart_id 
    AND carts.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update their own cart items" ON cart_items;
CREATE POLICY "Users can update their own cart items" 
ON cart_items FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM carts 
    WHERE carts.id = cart_items.cart_id 
    AND carts.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can delete their own cart items" ON cart_items;
CREATE POLICY "Users can delete their own cart items" 
ON cart_items FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM carts 
    WHERE carts.id = cart_items.cart_id 
    AND carts.user_id = auth.uid()
  )
);
