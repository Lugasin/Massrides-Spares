-- Migration: Make cart_id nullable in cart_items to support user_id-only constraints
-- Fixes 400 Bad Request when frontend sends user_id without cart_id

DO $$
BEGIN
  -- Make cart_id nullable
  ALTER TABLE public.cart_items ALTER COLUMN cart_id DROP NOT NULL;

  -- Add check constraint to ensure at least one identifier exists
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_identity_check') THEN
    ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_identity_check CHECK (cart_id IS NOT NULL OR user_id IS NOT NULL);
  END IF;

END $$;
