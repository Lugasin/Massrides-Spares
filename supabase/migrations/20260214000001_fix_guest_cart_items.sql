-- Migration: Fix guest_cart_items schema
-- The live guest_cart_items table (from core_schema) has:
--   guest_cart_id uuid (FK to guest_carts)
-- The frontend code expects: guest_session_id text, spare_part_id uuid
-- This migration adds both columns for compatibility.

-- 1. Add guest_session_id column if it doesn't exist
ALTER TABLE public.guest_cart_items 
  ADD COLUMN IF NOT EXISTS guest_session_id text;

-- 2. Add spare_part_id column if it doesn't exist
ALTER TABLE public.guest_cart_items 
  ADD COLUMN IF NOT EXISTS spare_part_id uuid REFERENCES public.spare_parts(id) ON DELETE CASCADE;

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_guest_cart_items_spare_part_id 
  ON public.guest_cart_items(spare_part_id);

CREATE INDEX IF NOT EXISTS idx_guest_cart_items_session_id 
  ON public.guest_cart_items(guest_session_id);

-- 4. Ensure RLS is enabled and open for anon/authenticated
ALTER TABLE public.guest_cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can manage guest cart items" ON public.guest_cart_items;
CREATE POLICY "Anyone can manage guest cart items"
  ON public.guest_cart_items FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
