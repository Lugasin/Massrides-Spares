-- Consolidated Fixes for Guest Sessions, Orders, and Schema Alignment
-- Generated for db push

-- 1. FIX GUEST SESSIONS (Schema & Constraints)
-- Ensure 'id' and 'session_id' columns exist
ALTER TABLE guest_sessions 
ADD COLUMN IF NOT EXISTS id uuid DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS session_id text;

-- Populate session_id safely
UPDATE guest_sessions 
SET session_id = gen_random_uuid()::text 
WHERE session_id IS NULL;

-- Ensure Unique Index on session_id
DROP INDEX IF EXISTS guest_sessions_session_id_idx;
CREATE UNIQUE INDEX guest_sessions_session_id_idx ON guest_sessions (session_id);

-- Ensure Constraint relies on Index
ALTER TABLE guest_sessions DROP CONSTRAINT IF EXISTS guest_sessions_session_id_key;
ALTER TABLE guest_sessions ADD CONSTRAINT guest_sessions_session_id_key UNIQUE USING INDEX guest_sessions_session_id_idx;

-- Fix Foreign Keys (Repoint to session_id)
-- Orders FK
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_guest_token_fkey;
ALTER TABLE orders 
  ADD CONSTRAINT orders_guest_token_fkey 
  FOREIGN KEY (guest_token) 
  REFERENCES guest_sessions (session_id) 
  ON DELETE SET NULL;

-- Carts FK (if exists)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'carts') THEN
        ALTER TABLE carts DROP CONSTRAINT IF EXISTS carts_guest_token_fkey;
        ALTER TABLE carts 
          ADD CONSTRAINT carts_guest_token_fkey 
          FOREIGN KEY (guest_token) 
          REFERENCES guest_sessions (session_id) 
          ON DELETE SET NULL;
    END IF;
END $$;


-- 2. FIX ORDER COLUMNS
-- Add missing customer_info
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS customer_info jsonb DEFAULT '{}'::jsonb;


-- 3. FIX GUEST CART ITEMS (Schema Alignment)
-- Rename spare_part_id to product_id for PostgREST compatibility
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'guest_cart_items' 
        AND column_name = 'spare_part_id'
    ) THEN
        ALTER TABLE guest_cart_items RENAME COLUMN spare_part_id TO product_id;
    END IF;
END $$;

-- Fix Foreign Key for guest_cart_items
ALTER TABLE guest_cart_items DROP CONSTRAINT IF EXISTS guest_cart_items_spare_part_id_fkey;
ALTER TABLE guest_cart_items DROP CONSTRAINT IF EXISTS guest_cart_items_product_id_fkey;

ALTER TABLE guest_cart_items 
    ADD CONSTRAINT guest_cart_items_product_id_fkey 
    FOREIGN KEY (product_id) 
    REFERENCES products(id) 
    ON DELETE CASCADE;

-- Reload Schema Cache
NOTIFY pgrst, 'reload schema';
