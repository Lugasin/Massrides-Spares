-- Migration: Orders, Payments, Refunds, and Audit Logs (Corrected)
-- Purpose: Enhance orders table and create new tables for fintech system.

-- 1. Update ORDERS table
-- Check existing columns to avoid errors
ALTER TABLE IF EXISTS orders
    ADD COLUMN IF NOT EXISTS billing_address jsonb,
    ADD COLUMN IF NOT EXISTS delivery_address jsonb,
    ADD COLUMN IF NOT EXISTS subtotal numeric(12,2),
    ADD COLUMN IF NOT EXISTS fees numeric(12,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS total numeric(12,2),
    ADD COLUMN IF NOT EXISTS order_status order_status DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS payment_status payment_status DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS guest_session_id text; -- Backwards compat alias for guest_token

-- Indexes for Orders
-- Use guest_token as primary index for guests
CREATE INDEX IF NOT EXISTS idx_orders_guest_token ON orders(guest_token);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- 2. PAYMENTS table
-- Drop invalid existing table to recreate with correct UUID PK and Enum types
DROP TABLE IF EXISTS refunds CASCADE; -- Drop dependent table first
DROP TABLE IF EXISTS payments CASCADE;

CREATE TABLE payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id bigint UNIQUE REFERENCES orders(id) ON DELETE RESTRICT, -- Must be bigint to match orders.id
    vesicash_transaction_id text,
    amount numeric(12,2) NOT NULL,
    currency text DEFAULT 'ZMW',
    payment_status payment_status DEFAULT 'pending',
    raw_payload jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 3. REFUNDS table
CREATE TABLE refunds (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id uuid REFERENCES payments(id) ON DELETE RESTRICT,
    amount numeric(12,2) NOT NULL,
    refund_status refund_status DEFAULT 'pending',
    reason text,
    initiated_by uuid REFERENCES auth.users(id),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 4. AUDIT_LOGS table (Append-Only)
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

-- Security for Audit Logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN 
  -- Revoke everything first
  REVOKE ALL ON audit_logs FROM public, anon, authenticated;
  -- Grant specific rights
  GRANT SELECT, INSERT ON audit_logs TO authenticated, service_role;
  GRANT ALL ON audit_logs TO service_role;
END $$;

CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Service Role can manage audit logs" ON audit_logs
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Grant access to other tables
GRANT ALL ON payments TO service_role;
GRANT ALL ON refunds TO service_role;

-- RLS for Payments
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payments via order" ON payments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders
            WHERE orders.id = payments.order_id
            AND orders.user_id = auth.uid() -- Only for authenticated users
        )
    );

CREATE POLICY "Admins view all payments" ON payments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'super_admin')
        )
    );
