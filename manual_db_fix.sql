-- MANUAL FIX SCRIPT (Run in Supabase Dashboard -> SQL Editor)

BEGIN;

-- 1. FIX CART 406 (Duplicate Carts)
-- Identify and remove duplicate carts, keeping the most recent one per user
CREATE TEMP TABLE IF NOT EXISTS duplicate_carts AS
SELECT id FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) as r_num
  FROM carts
  WHERE user_id IS NOT NULL
) t WHERE t.r_num > 1;

DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM duplicate_carts);
DELETE FROM carts WHERE id IN (SELECT id FROM duplicate_carts);

-- Enforce uniqueness to prevent future 406 errors
ALTER TABLE carts DROP CONSTRAINT IF EXISTS carts_user_id_key;
ALTER TABLE carts ADD CONSTRAINT carts_user_id_key UNIQUE (user_id);

-- Fix 403 on POST /carts (Ensure insert policy exists)
DROP POLICY IF EXISTS "Users can insert own cart" ON carts;
DROP POLICY IF EXISTS "Users can select own cart" ON carts;
DROP POLICY IF EXISTS "Users can update own cart" ON carts;
DROP POLICY IF EXISTS "Users can delete own cart" ON carts;

CREATE POLICY "Users can insert own cart" ON carts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can select own cart" ON carts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own cart" ON carts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own cart" ON carts FOR DELETE TO authenticated USING (auth.uid() = user_id);


-- 2. FIX WISHLIST 403 / 42501 (Permissions)
-- Grant explicit access to authenticated users
GRANT ALL ON TABLE wishlists TO authenticated;
GRANT ALL ON TABLE wishlists TO service_role;
GRANT USAGE, SELECT ON SEQUENCE wishlists_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE wishlists_id_seq TO service_role;

-- Ensure products can be read (for joins)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Enable read access for all users') THEN
        CREATE POLICY "Enable read access for all users" ON products FOR SELECT USING (true);
    END IF;
END $$;


-- 3. FIX ACTIVITY LOG 409 (Foreign Key Conflict)
-- If activity_logs points to 'users' table which might be ambiguous or strict
-- We ensure it points to auth.users OR handles missing profiles gracefully.
-- NOTE: We will assume it points to auth.users. If it points to public.profiles, ensure profiles exist.

-- Simple fix: If a log fails, it shouldn't crash. But we can't change code here.
-- We can relax the constraint or ensure it points to auth.users
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

COMMIT;
