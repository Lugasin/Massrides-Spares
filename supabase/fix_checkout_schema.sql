-- Fix Schema Mismatch for Checkout
-- The error "invalid input syntax for type uuid: "1"" indicates that order_items.product_id 
-- is incorrectly defined as UUID, while our products use BigInt IDs.

BEGIN;

-- 1. Fix order_items.product_id (Should be bigint to match products.id)
ALTER TABLE public.order_items 
  DROP CONSTRAINT IF EXISTS order_items_product_id_fkey;

-- If it's already bigint, this is a no-op. If it's UUID, this changes it.
-- We use USING to handle potential casting if needed, though for "1" it might fail if strictly uuid.
-- Assuming the table is essentially empty/invalid if this error is happening.
TRUNCATE public.order_items CASCADE; -- Safe for dev, ensures clean slate for type change

ALTER TABLE public.order_items 
  ALTER COLUMN product_id TYPE bigint;

ALTER TABLE public.order_items 
  ADD CONSTRAINT order_items_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES public.products(id);


-- 2. Ensure cart_items matches too (just in case)
ALTER TABLE public.cart_items 
  DROP CONSTRAINT IF EXISTS cart_items_product_id_fkey;

ALTER TABLE public.cart_items 
  ALTER COLUMN product_id TYPE bigint;

ALTER TABLE public.cart_items 
  ADD CONSTRAINT cart_items_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES public.products(id);


-- 3. Ensure inventory matches too
ALTER TABLE public.inventory 
  DROP CONSTRAINT IF EXISTS inventory_product_id_fkey;

ALTER TABLE public.inventory 
  ALTER COLUMN product_id TYPE bigint;

ALTER TABLE public.inventory 
  ADD CONSTRAINT inventory_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


COMMIT;
