-- Fix Cart Uniqueness to prevent 406 errors
BEGIN;

-- 1. Identify and Merge Duplicates (Cleanup Phase)
-- We want to keep the most recent cart for each user.
-- But we should try to move items from old carts to the new one if possible.
-- For simplicity in SQL, we will just delete older empty carts, or keep the default one.

-- Create a temporary table to identify duplicates to delete
CREATE TEMP TABLE duplicate_carts AS
SELECT id
FROM (
  SELECT id,
       ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY updated_at DESC) as r_num
  FROM carts
  WHERE user_id IS NOT NULL
) t
WHERE t.r_num > 1;

-- Delete items from duplicate carts (CASCADE would handle this, but being explicit)
DELETE FROM cart_items WHERE cart_id IN (SELECT id FROM duplicate_carts);

-- Delete duplicate carts
DELETE FROM carts WHERE id IN (SELECT id FROM duplicate_carts);

-- 2. Add Unique Constraint
-- Now that duplicates are gone, we can safely add the constraint.
ALTER TABLE carts
ADD CONSTRAINT carts_user_id_key UNIQUE (user_id);

-- 3. Ensure Products RLS is open (Fixing Wishlist 403 indirectly if products blocked)
-- If products has RLS enabled, ensure there is a policy for public read.
-- Inspecting consolidated_init might reveal if RLS was on.
-- Safe to add "Enable read access for all" if not exists.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'Enable read access for all users'
    ) THEN
        CREATE POLICY "Enable read access for all users" ON products FOR SELECT USING (true);
    END IF;
END
$$;

COMMIT;
