-- Phase 1 Migration: Schema Refactor for Production-Ready PWA
-- This migration is idempotent and can be run multiple times safely.

BEGIN;

-- ==========================================
-- 1.1 Payments Table (Provider-Agnostic)
-- ==========================================

-- Add new columns to payments table
ALTER TABLE public.payments 
  ADD COLUMN IF NOT EXISTS provider_reference text;

ALTER TABLE public.payments 
  ADD COLUMN IF NOT EXISTS amount numeric;

ALTER TABLE public.payments 
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'ZMW';

ALTER TABLE public.payments 
  ADD COLUMN IF NOT EXISTS raw_payload jsonb;

ALTER TABLE public.payments 
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Migrate existing vesicash_transaction_id to provider_reference
UPDATE public.payments 
SET provider_reference = vesicash_transaction_id 
WHERE provider_reference IS NULL AND vesicash_transaction_id IS NOT NULL;

-- Create index on provider_reference
CREATE INDEX IF NOT EXISTS idx_payments_provider_reference ON public.payments(provider_reference);

-- Drop old constraint and add new unified status enum
-- First, update any existing statuses to match new enum
UPDATE public.payments SET status = 'pending' WHERE status NOT IN ('pending', 'initiated', 'redirected', 'processing', 'paid', 'failed', 'cancelled');

-- We can't easily modify CHECK constraint, so we'll drop and recreate
-- First check if the old constraint exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'payments' AND constraint_name = 'payments_status_check'
  ) THEN
    ALTER TABLE public.payments DROP CONSTRAINT payments_status_check;
  END IF;
END $$;

-- Add new unified status constraint
ALTER TABLE public.payments 
  ADD CONSTRAINT payments_status_check 
  CHECK (status = ANY (ARRAY[
    'pending'::text, 
    'initiated'::text, 
    'redirected'::text, 
    'processing'::text, 
    'paid'::text, 
    'failed'::text, 
    'cancelled'::text
  ]));

-- ==========================================
-- 1.2 Orders Table (Guest Checkout Support)
-- ==========================================

-- Make user_id nullable for guest checkout
ALTER TABLE public.orders 
  ALTER COLUMN user_id DROP NOT NULL;

-- Add guest contact fields
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS guest_email text;

ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS guest_phone text;

ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS customer_email text;

ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS total numeric;

ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'ZMW';

-- Update order status constraint to unified set
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'orders' AND constraint_name = 'orders_status_check'
  ) THEN
    ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
  END IF;
END $$;

ALTER TABLE public.orders 
  ADD CONSTRAINT orders_status_check 
  CHECK (status = ANY (ARRAY[
    'pending'::text,
    'awaiting_payment'::text,
    'paid'::text,
    'processing'::text,
    'shipped'::text,
    'delivered'::text,
    'cancelled'::text,
    'refunded'::text
  ]));

-- RLS Policy for guest orders (allow service role to create)
DROP POLICY IF EXISTS "Allow service role to create guest orders" ON public.orders;
CREATE POLICY "Allow service role to create guest orders" ON public.orders 
  FOR INSERT 
  WITH CHECK (true);

-- ==========================================
-- 1.3 Vendors Table
-- ==========================================

CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  slug text UNIQUE,
  description text,
  logo_url text,
  contact_email text,
  contact_phone text,
  address jsonb,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vendors_pkey PRIMARY KEY (id),
  CONSTRAINT vendors_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id)
);

-- Vendor Users junction table
CREATE TABLE IF NOT EXISTS public.vendor_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'staff'::text 
    CHECK (role = ANY (ARRAY['owner'::text, 'manager'::text, 'staff'::text])),
  invited_at timestamp with time zone DEFAULT now(),
  joined_at timestamp with time zone,
  CONSTRAINT vendor_users_pkey PRIMARY KEY (id),
  CONSTRAINT vendor_users_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE,
  CONSTRAINT vendor_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT vendor_users_unique UNIQUE (vendor_id, user_id)
);

-- Vendor Orders tracking (per-vendor view of multi-vendor orders)
CREATE TABLE IF NOT EXISTS public.vendor_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  order_id bigint NOT NULL,
  order_item_id bigint,
  status text NOT NULL DEFAULT 'pending'::text,
  subtotal numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vendor_orders_pkey PRIMARY KEY (id),
  CONSTRAINT vendor_orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE,
  CONSTRAINT vendor_orders_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE
);

-- Inventory Logs (audit trail)
CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id bigint NOT NULL,
  vendor_id uuid,
  change_type text NOT NULL CHECK (change_type = ANY (ARRAY['restock'::text, 'sale'::text, 'adjustment'::text, 'return'::text])),
  quantity_change integer NOT NULL,
  previous_quantity integer NOT NULL,
  new_quantity integer NOT NULL,
  reason text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_logs_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_logs_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE
);

-- ==========================================
-- 1.4 Email Logs Table
-- ==========================================

CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id bigint,
  recipient text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY[
    'order_confirmation'::text, 
    'payment_receipt'::text, 
    'shipping_update'::text, 
    'welcome'::text, 
    'password_reset'::text, 
    'otp'::text,
    'other'::text
  ])),
  subject text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text])),
  provider text,
  provider_message_id text,
  error text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_logs_pkey PRIMARY KEY (id),
  CONSTRAINT email_logs_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL
);

-- ==========================================
-- 1.5 Notifications (Role-Based)
-- ==========================================

-- Add target_role column for role-based broadcasts
ALTER TABLE public.notifications 
  ADD COLUMN IF NOT EXISTS target_role text;

-- Make user_id nullable (for role broadcasts)
ALTER TABLE public.notifications 
  ALTER COLUMN user_id DROP NOT NULL;

-- ==========================================
-- RLS Policies
-- ==========================================

-- Vendors
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendors are viewable by everyone" ON public.vendors;
CREATE POLICY "Vendors are viewable by everyone" ON public.vendors 
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Vendor owners can manage their vendor" ON public.vendors;
CREATE POLICY "Vendor owners can manage their vendor" ON public.vendors 
  FOR ALL USING (owner_id = auth.uid());

-- Vendor Users
ALTER TABLE public.vendor_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendor users can view their own memberships" ON public.vendor_users;
CREATE POLICY "Vendor users can view their own memberships" ON public.vendor_users 
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Vendor owners can manage vendor users" ON public.vendor_users;
CREATE POLICY "Vendor owners can manage vendor users" ON public.vendor_users 
  FOR ALL USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE owner_id = auth.uid())
  );

-- Vendor Orders
ALTER TABLE public.vendor_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendor users can view their vendor orders" ON public.vendor_orders;
CREATE POLICY "Vendor users can view their vendor orders" ON public.vendor_orders 
  FOR SELECT USING (
    vendor_id IN (SELECT vendor_id FROM public.vendor_users WHERE user_id = auth.uid())
  );

-- Inventory Logs
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vendor users can view inventory logs" ON public.inventory_logs;
CREATE POLICY "Vendor users can view inventory logs" ON public.inventory_logs 
  FOR SELECT USING (
    vendor_id IN (SELECT vendor_id FROM public.vendor_users WHERE user_id = auth.uid())
  );

-- Email Logs (admin only via service role)
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- Indexes
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_vendors_owner_id ON public.vendors(owner_id);
CREATE INDEX IF NOT EXISTS idx_vendors_slug ON public.vendors(slug);
CREATE INDEX IF NOT EXISTS idx_vendor_users_vendor_id ON public.vendor_users(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_users_user_id ON public.vendor_users(user_id);
CREATE INDEX IF NOT EXISTS idx_vendor_orders_vendor_id ON public.vendor_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_orders_order_id ON public.vendor_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_product_id ON public.inventory_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_vendor_id ON public.inventory_logs(vendor_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_order_id ON public.email_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON public.email_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_orders_guest_email ON public.orders(guest_email);
CREATE INDEX IF NOT EXISTS idx_notifications_target_role ON public.notifications(target_role);

-- ==========================================
-- Grants
-- ==========================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON TABLE public.vendors TO authenticated;
GRANT ALL ON TABLE public.vendor_users TO authenticated;
GRANT ALL ON TABLE public.vendor_orders TO authenticated;
GRANT ALL ON TABLE public.inventory_logs TO authenticated;
GRANT SELECT ON TABLE public.email_logs TO authenticated;

COMMIT;
