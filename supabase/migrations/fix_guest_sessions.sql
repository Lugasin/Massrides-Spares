-- 1. Add session_id column safely
ALTER TABLE guest_sessions 
ADD COLUMN IF NOT EXISTS session_id text;

-- 2. Populate session_id with random UUIDs for existing rows
-- This avoids the "id column missing" error entirely
UPDATE guest_sessions 
SET session_id = gen_random_uuid()::text 
WHERE session_id IS NULL;

-- 3. Ensure Unique Constraint on session_id
DROP INDEX IF EXISTS guest_sessions_session_id_idx;
CREATE UNIQUE INDEX guest_sessions_session_id_idx ON guest_sessions (session_id);

ALTER TABLE guest_sessions DROP CONSTRAINT IF EXISTS guest_sessions_session_id_key;
ALTER TABLE guest_sessions ADD CONSTRAINT guest_sessions_session_id_key UNIQUE USING INDEX guest_sessions_session_id_idx;

-- 4. Fix Foreign Keys (Repoint them to session_id)
-- Orders
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_guest_token_fkey;
ALTER TABLE orders 
  ADD CONSTRAINT orders_guest_token_fkey 
  FOREIGN KEY (guest_token) 
  REFERENCES guest_sessions (session_id) 
  ON DELETE SET NULL;

-- Carts
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
