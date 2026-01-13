-- Migration: Commission & Payout System (Supabase Native)
-- Generated: 2026-01-13

BEGIN;

-- 1. Commission Configuration
CREATE TYPE public.commission_entity AS ENUM ('platform', 'vendor', 'category');

CREATE TABLE IF NOT EXISTS public.commission_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type public.commission_entity NOT NULL,
  entity_id text, -- Changed to TEXT to support both UUID (Vendor) and BigInt (Category) IDs
  rate numeric(5,2) NOT NULL CHECK (rate >= 0 AND rate <= 100),
  is_percentage boolean DEFAULT true,
  fixed_amount numeric(12,2),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(entity_type, entity_id),
  -- Ensure vendor references are valid (Partial enforcement via check, full via FK logic in app)
  CONSTRAINT valid_vendor CHECK (
    entity_type != 'vendor' OR 
    entity_id IS NOT NULL 
  )
);

CREATE INDEX IF NOT EXISTS idx_commission_configs_entity ON public.commission_configs(entity_type, entity_id);

-- 2. Escrow Releases
CREATE TABLE IF NOT EXISTS public.escrow_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id bigint REFERENCES orders(id) UNIQUE NOT NULL, -- Changed to bigint to match orders.id
  payment_id bigint REFERENCES payments(id), 
  vesicash_transaction_id text UNIQUE,
  total_amount numeric(12,2) NOT NULL,
  vendor_amount numeric(12,2) NOT NULL,
  platform_amount numeric(12,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'disputed')),
  released_at timestamptz,
  idempotency_key text UNIQUE NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_escrow_releases_order ON public.escrow_releases(order_id);
CREATE INDEX IF NOT EXISTS idx_escrow_releases_status ON public.escrow_releases(status);

-- 3. Vendor Payouts
CREATE TABLE IF NOT EXISTS public.vendor_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES user_profiles(id) NOT NULL,
  escrow_release_id uuid REFERENCES escrow_releases(id),
  order_id bigint REFERENCES orders(id) NOT NULL, -- Changed to bigint
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'on_hold')),
  payout_method text,
  payout_reference text UNIQUE,
  scheduled_at timestamptz,
  completed_at timestamptz,
  failure_reason text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_payouts_vendor ON public.vendor_payouts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payouts_status ON public.vendor_payouts(status);

-- 4. Platform Commissions
CREATE TABLE IF NOT EXISTS public.platform_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id bigint REFERENCES orders(id) UNIQUE NOT NULL, -- Changed to bigint
  escrow_release_id uuid REFERENCES escrow_releases(id),
  vendor_id uuid REFERENCES user_profiles(id) NOT NULL,
  commission_config_id uuid REFERENCES commission_configs(id),
  base_amount numeric(12,2) NOT NULL,
  commission_rate numeric(5,2) NOT NULL,
  commission_amount numeric(12,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'recorded', 'reversed')),
  recorded_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_commissions_order ON public.platform_commissions(order_id);
CREATE INDEX IF NOT EXISTS idx_platform_commissions_vendor ON public.platform_commissions(vendor_id);

-- 5. Financial Audit Log
CREATE TABLE IF NOT EXISTS public.financial_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL, -- UUID as text to allow flexible references
  actor_id uuid REFERENCES user_profiles(id),
  amount numeric(12,2),
  currency text DEFAULT 'ZMW',
  before_state jsonb,
  after_state jsonb,
  metadata jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financial_audit_entity ON public.financial_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_created ON public.financial_audit_logs(created_at DESC);

-- 6. Webhook Processing Log
CREATE TABLE IF NOT EXISTS public.webhook_processing_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id text UNIQUE NOT NULL,
  provider text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed_at timestamptz DEFAULT now(),
  processing_duration_ms integer,
  status text DEFAULT 'success' CHECK (status IN ('success', 'failed', 'duplicate'))
);

-- RLS POLICIES

-- Enable RLS
ALTER TABLE public.vendor_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_configs ENABLE ROW LEVEL SECURITY;

-- Vendor Payouts: Vendors see their own, Admins see all
CREATE POLICY vendor_payouts_select ON public.vendor_payouts
  FOR SELECT USING (
    auth.uid() = vendor_id OR 
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Platform Commissions: Vendors see their own, Admins see all
CREATE POLICY vendor_commissions_select ON public.platform_commissions
  FOR SELECT USING (
    auth.uid() = vendor_id OR 
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Audit Logs: Admins only
CREATE POLICY admin_financial_audit_select ON public.financial_audit_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Configs: Read-only for authenticated, Write for Admins
CREATE POLICY config_read_all ON public.commission_configs
  FOR SELECT TO authenticated USING (true);

-- Seed Default Platform Commission (5%)
INSERT INTO public.commission_configs (entity_type, entity_id, rate, is_percentage)
VALUES ('platform', NULL, 5.00, true)
ON CONFLICT (entity_type, entity_id) DO NOTHING;

COMMIT;
