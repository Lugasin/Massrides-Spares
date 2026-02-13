-- Migration: Fix authenticated user access to spare_parts and cart_items
-- 
-- Problem 1: Authenticated users get 403 on spare_parts because RLS policies
--   reference user_profiles, but authenticated role has no SELECT grant on user_profiles.
-- Problem 2: Frontend cart.ts uses cart_items.user_id which does not exist.
--   The schema uses cart_id FK to user_carts, but frontend expects a flat user_id column.

-- =============================================================================
-- FIX 1: Grant SELECT on user_profiles to authenticated
-- This allows RLS policy subqueries on spare_parts (vendor check) to work.
-- =============================================================================
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT ALL ON public.cart_items TO authenticated;

-- =============================================================================
-- FIX 2: Add user_id column to cart_items to match frontend contract
-- Frontend cart.ts queries: .eq('user_id', user.id) on cart_items
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cart_items' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.cart_items ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    CREATE INDEX idx_cart_items_user_id ON public.cart_items(user_id);
  END IF;
END $$;

-- Add unique constraint on (user_id, spare_part_id) for upsert behavior
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cart_items_user_spare_unique'
  ) THEN
    ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_user_spare_unique UNIQUE (user_id, spare_part_id);
  END IF;
END $$;

-- =============================================================================
-- FIX 3: Update RLS policies on cart_items to use user_id directly
-- =============================================================================
DROP POLICY IF EXISTS "Users can manage own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Allow users to manage their own cart items" ON public.cart_items;

CREATE POLICY "Users can manage own cart items"
  ON public.cart_items FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
