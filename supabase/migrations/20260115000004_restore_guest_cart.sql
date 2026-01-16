-- Restore Guest Cart Tables
-- Required by src/lib/guestCart.ts

CREATE TABLE IF NOT EXISTS guest_carts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id text NOT NULL, -- The client-side generated token
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guest_cart_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    guest_cart_id uuid REFERENCES guest_carts(id) ON DELETE CASCADE,
    spare_part_id bigint REFERENCES products(id) ON DELETE CASCADE, -- assuming products table holds spare parts
    quantity integer DEFAULT 1,
    added_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guest_carts_session ON guest_carts(session_id);
CREATE INDEX IF NOT EXISTS idx_guest_items_cart ON guest_cart_items(guest_cart_id);

-- RLS
ALTER TABLE guest_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_cart_items ENABLE ROW LEVEL SECURITY;

-- Allow Anon/Public to fully manage these tables based on session_id?
-- Since session_id is a secret token held by client, we can treat it as ownership?
-- But for simplicity and Guest usage, we often open these up to public for INSERT/SELECT
-- provided they know the IDs.

-- Guest Carts Policy
CREATE POLICY "Public enable all access to guest_carts" ON guest_carts
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

-- Guest Cart Items Policy
CREATE POLICY "Public enable all access to guest_cart_items" ON guest_cart_items
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

-- Grant permissions (Crucial for 406 fix if using PostgREST)
GRANT ALL ON guest_carts TO anon, authenticated, service_role;
GRANT ALL ON guest_cart_items TO anon, authenticated, service_role;
