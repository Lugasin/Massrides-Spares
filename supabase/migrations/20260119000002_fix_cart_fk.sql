-- CRITICAL FIX: Cart Foreign Key Constraint
-- The carts.user_id currently references profiles(id), but should reference auth.users(id) directly.
-- This is causing 406/409 errors because profiles rows may not exist.

BEGIN;

-- Fix 1: Drop the bad FK and create correct one
ALTER TABLE carts DROP CONSTRAINT IF EXISTS carts_user_id_fkey;
ALTER TABLE carts 
  ADD CONSTRAINT carts_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Fix 2: Ensure RLS policies exist for carts
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own cart" ON carts;
DROP POLICY IF EXISTS "Users can insert own cart" ON carts;
DROP POLICY IF EXISTS "Users can update own cart" ON carts;
DROP POLICY IF EXISTS "Users can delete own cart" ON carts;

CREATE POLICY "Users can select own cart" ON carts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own cart" ON carts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cart" ON carts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cart" ON carts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Fix 3: Partial unique index (one cart per auth user)
DROP INDEX IF EXISTS one_cart_per_user;
CREATE UNIQUE INDEX one_cart_per_user ON carts(user_id) WHERE user_id IS NOT NULL;

-- Fix 4: Clean up duplicate carts (keep most recent)
DELETE FROM cart_items WHERE cart_id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) as rn
    FROM carts WHERE user_id IS NOT NULL
  ) t WHERE t.rn > 1
);
DELETE FROM carts WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) as rn
    FROM carts WHERE user_id IS NOT NULL
  ) t WHERE t.rn > 1
);

COMMIT;
