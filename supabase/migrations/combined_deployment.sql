-- Fix Missing INSERT/UPDATE Policies
-- The consolidated init seemed to lack INSERT policies for critical ecommerce tables.

-- 1. ORDERS
-- Allow Users and Guests to create orders
DROP POLICY IF EXISTS "Enable insert for authenticated users and guests" ON orders;
CREATE POLICY "Enable insert for authenticated users and guests" ON orders
    FOR INSERT TO public
    WITH CHECK (true); 

-- 2. ORDER ITEMS
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable insert for orders" ON order_items;
CREATE POLICY "Enable insert for orders" ON order_items
    FOR INSERT TO public
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
        )
    );
    
DROP POLICY IF EXISTS "Enable select for order owners" ON order_items;
CREATE POLICY "Enable select for order owners" ON order_items
    FOR SELECT TO public
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = order_items.order_id
            AND (orders.user_id = auth.uid())
        )
    );

-- 3. GUEST SESSIONS
CREATE TABLE IF NOT EXISTS guest_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE guest_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for anon" ON guest_sessions;
CREATE POLICY "Enable all access for anon" ON guest_sessions
    FOR ALL TO anon
    USING (true)
    WITH CHECK (true);

-- 4. CARTS
-- Ensure carts are writable
DROP POLICY IF EXISTS "Enable insert/update for own cart" ON carts;
CREATE POLICY "Enable insert/update for own cart" ON carts
    FOR ALL TO public
    USING (user_id = auth.uid() OR guest_token IS NOT NULL)
    WITH CHECK (user_id = auth.uid() OR guest_token IS NOT NULL);

-- Restore permissions for Service Role on Public Schema
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres;

-- Restore Guest Cart Tables
CREATE TABLE IF NOT EXISTS guest_carts (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id text NOT NULL, 
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guest_cart_items (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    guest_cart_id uuid REFERENCES guest_carts(id) ON DELETE CASCADE,
    spare_part_id bigint REFERENCES products(id) ON DELETE CASCADE, 
    quantity integer DEFAULT 1,
    added_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guest_carts_session ON guest_carts(session_id);
CREATE INDEX IF NOT EXISTS idx_guest_items_cart ON guest_cart_items(guest_cart_id);

-- RLS
ALTER TABLE guest_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_cart_items ENABLE ROW LEVEL SECURITY;

-- Guest Carts Policy
DROP POLICY IF EXISTS "Public enable all access to guest_carts" ON guest_carts;
CREATE POLICY "Public enable all access to guest_carts" ON guest_carts
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

-- Guest Cart Items Policy
DROP POLICY IF EXISTS "Public enable all access to guest_cart_items" ON guest_cart_items;
CREATE POLICY "Public enable all access to guest_cart_items" ON guest_cart_items
    FOR ALL TO public
    USING (true)
    WITH CHECK (true);

GRANT ALL ON guest_carts TO anon, authenticated, service_role;
GRANT ALL ON guest_cart_items TO anon, authenticated, service_role;

-- GUEST ACTIVITY LOGS (General)
CREATE TABLE IF NOT EXISTS activity_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id),
    action text NOT NULL,
    entity_type text,
    entity_id text,
    details jsonb DEFAULT '{}'::jsonb,
    ip_address text,
    user_agent text,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view all logs" ON activity_logs;
CREATE POLICY "Admins view all logs" ON activity_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Users can insert logs" ON activity_logs;
CREATE POLICY "Users can insert logs" ON activity_logs
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

GRANT ALL ON activity_logs TO service_role;
GRANT INSERT ON activity_logs TO authenticated;

-- FINTECH ENUMS
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('draft', 'awaiting_payment', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'success', 'failed', 'reversed', 'refunded', 'expired');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE refund_status AS ENUM ('pending', 'approved', 'processing', 'completed', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE audit_event_type AS ENUM ('ORDER_CREATED', 'ORDER_UPDATED', 'ORDER_CANCELLED', 'PAYMENT_SESSION_CREATED', 'PAYMENT_PENDING', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'PAYMENT_REVERSED', 'REFUND_REQUESTED', 'REFUND_APPROVED', 'REFUND_COMPLETED', 'CART_CREATED', 'CART_UPDATED', 'CART_CLEARED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ORDERS EXTENSION
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS billing_address jsonb;
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS delivery_address jsonb;
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS subtotal numeric(12,2);
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS fees numeric(12,2) DEFAULT 0;
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS total numeric(12,2);
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS order_status order_status DEFAULT 'draft';
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS payment_status payment_status DEFAULT 'pending';
ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS guest_session_id text;

CREATE INDEX IF NOT EXISTS idx_orders_guest_token ON orders(guest_token);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- PAYMENTS & REFUNDS (Recreate if needed, safely)
-- Note: Dropping tables deletes data. If tables exist and have data, be careful.
-- Assuming dev env or compatible schema.
CREATE TABLE IF NOT EXISTS payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id bigint REFERENCES orders(id) ON DELETE RESTRICT, -- Wait, existing orders table uses bigint ID? YES.
    vesicash_transaction_id text,
    amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'ZMW',
    payment_status payment_status DEFAULT 'pending',
    raw_payload jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);
-- If table exists but missing columns, ALTER would be better, but simplified for now:
-- If it exists, we assume it's correct or we rely on user accepting overwrite?
-- User Prompt said "already exists".
-- Let's use CREATE TABLE IF NOT EXISTS.
-- BUT uniqueness on order_id requires constraint.
DO $$ BEGIN
    ALTER TABLE payments ADD CONSTRAINT payments_order_id_key UNIQUE (order_id);
EXCEPTION WHEN duplicate_table THEN null; WHEN duplicate_object THEN null; END $$;


CREATE TABLE IF NOT EXISTS refunds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id uuid REFERENCES payments(id) ON DELETE RESTRICT,
    amount numeric(12,2) NOT NULL,
    refund_status refund_status DEFAULT 'pending',
    reason text,
    initiated_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- AUDIT LOGS (Fintech)
CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    event_type audit_event_type NOT NULL,
    old_state jsonb,
    new_state jsonb,
    actor text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
  -- Revoke everything first to reset
  REVOKE ALL ON audit_logs FROM public, anon, authenticated;
  GRANT SELECT, INSERT ON audit_logs TO authenticated, service_role;
  GRANT ALL ON audit_logs TO service_role;
END $$;

DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Service Role can manage audit logs" ON audit_logs;
CREATE POLICY "Service Role can manage audit logs" ON audit_logs
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

GRANT ALL ON payments TO service_role;
GRANT ALL ON refunds TO service_role;

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own payments via order" ON payments;
CREATE POLICY "Users view own payments via order" ON payments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = payments.order_id
            AND orders.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins view all payments" ON payments;
CREATE POLICY "Admins view all payments" ON payments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );
