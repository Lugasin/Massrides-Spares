-- CRITICAL FIX: Cart Items RLS Policies
-- cart_items needs RLS policies that check ownership through carts table

BEGIN;

-- Enable RLS on cart_items
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can select own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can insert own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can update own cart items" ON cart_items;
DROP POLICY IF EXISTS "Users can delete own cart items" ON cart_items;

-- Create policies that check ownership through carts table
CREATE POLICY "Users can select own cart items" ON cart_items 
  FOR SELECT TO authenticated 
  USING (
    cart_id IN (SELECT id FROM carts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert own cart items" ON cart_items 
  FOR INSERT TO authenticated 
  WITH CHECK (
    cart_id IN (SELECT id FROM carts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own cart items" ON cart_items 
  FOR UPDATE TO authenticated 
  USING (
    cart_id IN (SELECT id FROM carts WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete own cart items" ON cart_items 
  FOR DELETE TO authenticated 
  USING (
    cart_id IN (SELECT id FROM carts WHERE user_id = auth.uid())
  );

COMMIT;
