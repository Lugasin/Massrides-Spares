-- Fintech-Grade Payment Schema
-- Date: 2026-01-15
-- Goal: Production-ready payment lifecycle with strict auditing and idempotency.

-- 1. Strict Payment Status Enum
-- Reflects the exact lifecycle of a fintech transaction
CREATE TYPE payment_status_enum AS ENUM (
    'PENDING',              -- Created, intent generated
    'AWAITING_PAYMENT',     -- User redirected to gateway
    'PROCESSING',           -- Webhook received, verifying
    'PAID',                 -- Success, funds captured
    'ESCROW_HELD',          -- Funds in Vesicash Escrow
    'PARTIALLY_REFUNDED',   -- Some funds returned
    'REFUND_PENDING',       -- Refund initiated but not cleared
    'REFUNDED',             -- Full refund completed
    'FAILED',               -- Payment failed
    'CANCELLED',            -- User or Admin cancelled
    'DISPUTED',             -- Chargeback/Dispute raised
    'EXPIRED'               -- Payment link expired
);

-- 2. Payments Table (The Single Source of Truth for Money)
-- Drop legacy table if it exists (from old migrations like consolidated_init)
DROP TABLE IF EXISTS payments CASCADE;

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id BIGINT NOT NULL REFERENCES orders(id),
    user_id UUID, -- Nullable for quest checkouts, but ideally linked if possible
    
    -- Transaction Details
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Vesicash Specifics
    provider_reference VARCHAR(100), -- Vesicash Payment ID / Reference
    merchant_reference VARCHAR(100) UNIQUE NOT NULL, -- Our Order Number / Ref
    payment_url TEXT,
    
    -- State
    status payment_status_enum NOT NULL DEFAULT 'PENDING',
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::JSONB, -- Store extra gateway info
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Index for fast lookups
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_merchant_ref ON payments(merchant_reference);
CREATE INDEX idx_payments_status ON payments(status);

-- 3. Payment Events (Immutable Audit Log)
-- "If money moves, it must be logged."
CREATE TABLE IF NOT EXISTS payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id),
    order_id BIGINT REFERENCES orders(id),
    
    event_type VARCHAR(50) NOT NULL, -- e.g., 'INTENT_CREATED', 'WEBHOOK_RECEIVED', 'STATUS_CHANGED'
    previous_status payment_status_enum,
    new_status payment_status_enum,
    
    payload JSONB, -- The raw data/payload causing this event
    source VARCHAR(50) DEFAULT 'system', -- 'webhook', 'user', 'admin', 'system'
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for auditing
CREATE INDEX idx_payment_events_payment_id ON payment_events(payment_id);

-- 4. Webhook Processing Log (Idempotency Engine)
-- Prevents double-processing of money events
CREATE TABLE IF NOT EXISTS webhook_processing_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id VARCHAR(100) UNIQUE NOT NULL, -- The Event ID from Vesicash
    provider VARCHAR(50) DEFAULT 'vesicash',
    
    event_type VARCHAR(100),
    payload JSONB,
    
    status VARCHAR(20) CHECK (status IN ('processing', 'success', 'failed')),
    processing_duration_ms INTEGER,
    error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Admin Alerts (For Critical Failures)
-- Things that need HUMAN attention immediately
CREATE TABLE IF NOT EXISTS admin_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) CHECK (type IN ('info', 'warning', 'critical')),
    
    reference_id VARCHAR(100), -- Order ID or Payment ID
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RLS Policies

-- PAYMENTS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Admins: View All
CREATE POLICY "Admins view all payments" ON payments
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')));

-- Users: View Own
CREATE POLICY "Users view own payments" ON payments
    FOR SELECT TO authenticated
    USING (
        -- Link via order -> user_id
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = payments.order_id 
            AND orders.user_id = auth.uid()
        )
    );

-- PAYMENT EVENTS
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

-- Admins: View All
CREATE POLICY "Admins view all events" ON payment_events
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')));
    
-- Users: View Own (Optional, usually backend only, but good for transparency)
CREATE POLICY "Users view own payment events" ON payment_events
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = payment_events.order_id 
            AND orders.user_id = auth.uid()
        )
    );

-- ADMIN ALERTS
ALTER TABLE admin_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage alerts" ON admin_alerts
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')));

-- WEBHOOK LOGS
ALTER TABLE webhook_processing_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view logs" ON webhook_processing_log
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')));

-- Triggers for Updated At
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
