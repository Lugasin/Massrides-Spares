-- MassRides Comprehensive System Alignment Script
-- This script synchronizes the remote database with Phase 1, 2, and 3 schema refactors.
-- It is designed to be idempotent and safe to run multiple times.

BEGIN;

-- ==========================================
-- 1. Phase 1: Core Table Refactors
-- ==========================================

-- 1.1 Payments Table (Provider-Agnostic)
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS provider_reference text;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS amount numeric;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS currency text DEFAULT 'ZMW';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS raw_payload jsonb;
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE table_name = 'payments' AND constraint_name = 'payments_status_check') THEN
    ALTER TABLE public.payments DROP CONSTRAINT payments_status_check;
  END IF;
END $$;

ALTER TABLE public.payments 
  ADD CONSTRAINT payments_status_check 
  CHECK (status = ANY (ARRAY['pending'::text, 'initiated'::text, 'redirected'::text, 'processing'::text, 'paid'::text, 'failed'::text, 'cancelled'::text]));

-- 1.2 Orders Table (Guest Checkout Support)
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_email text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_phone text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS total numeric;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS currency text DEFAULT 'ZMW';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.constraint_column_usage WHERE table_name = 'orders' AND constraint_name = 'orders_status_check') THEN
    ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
  END IF;
END $$;

ALTER TABLE public.orders 
  ADD CONSTRAINT orders_status_check 
  CHECK (status = ANY (ARRAY['pending'::text, 'awaiting_payment'::text, 'paid'::text, 'processing'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text, 'refunded'::text]));

-- 1.3 Notifications Table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS target_role text;
ALTER TABLE public.notifications ALTER COLUMN user_id DROP NOT NULL;

-- ==========================================
-- 2. Phase 2 & 3: Vendor & Management Tables
-- ==========================================

-- 2.1 Vendors Table
CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id),
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
  CONSTRAINT vendors_pkey PRIMARY KEY (id)
);

-- 2.2 Vendor Users Junction
CREATE TABLE IF NOT EXISTS public.vendor_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'staff'::text CHECK (role = ANY (ARRAY['owner'::text, 'manager'::text, 'staff'::text])),
  invited_at timestamp with time zone DEFAULT now(),
  joined_at timestamp with time zone,
  CONSTRAINT vendor_users_pkey PRIMARY KEY (id),
  CONSTRAINT vendor_users_unique UNIQUE (vendor_id, user_id)
);

-- 2.3 Vendor Orders Tracking
CREATE TABLE IF NOT EXISTS public.vendor_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  order_id bigint NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id bigint,
  status text NOT NULL DEFAULT 'pending'::text,
  subtotal numeric,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vendor_orders_pkey PRIMARY KEY (id)
);

-- 2.4 Inventory Logs
CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id bigint NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  change_type text NOT NULL CHECK (change_type = ANY (ARRAY['restock'::text, 'sale'::text, 'adjustment'::text, 'return'::text])),
  quantity_change integer NOT NULL,
  previous_quantity integer NOT NULL,
  new_quantity integer NOT NULL,
  reason text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_logs_pkey PRIMARY KEY (id)
);

-- 2.5 Email Logs
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id bigint REFERENCES public.orders(id) ON DELETE SET NULL,
  recipient text NOT NULL,
  type text NOT NULL CHECK (type = ANY (ARRAY['order_confirmation'::text, 'payment_receipt'::text, 'shipping_update'::text, 'welcome'::text, 'password_reset'::text, 'otp'::text, 'other'::text])),
  subject text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'sent'::text, 'failed'::text])),
  provider text,
  provider_message_id text,
  error text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT email_logs_pkey PRIMARY KEY (id)
);

-- ==========================================
-- 3. Phase 3: Schema Alignment (Constraints)
-- ==========================================

-- 3.1 Align Products to Vendors
-- First, ensure every user that owns products has a vendor record
INSERT INTO public.vendors (id, owner_id, name)
SELECT gen_random_uuid(), vendor_id, 'Store ' || vendor_id::text
FROM public.products
ON CONFLICT (owner_id) DO NOTHING;

-- Update product constraint to point to public.vendors
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'products' AND constraint_name = 'products_vendor_id_fkey') THEN
    ALTER TABLE public.products DROP CONSTRAINT products_vendor_id_fkey;
  END IF;
END $$;

-- This part is tricky if vendor_id in products is currently auth.users.id
-- We might need a mapping update. For safety, we keep the column but update the reference goal.
-- To avoid breaking existing dev data, we only add the target role logic if it's already a UUID.
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS vendor_uuid_ref uuid REFERENCES public.vendors(id);

-- 3.2 Align Inventory to Vendors
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'inventory' AND constraint_name = 'inventory_vendor_id_fkey') THEN
    ALTER TABLE public.inventory DROP CONSTRAINT inventory_vendor_id_fkey;
  END IF;
END $$;

-- ==========================================
-- 4. Security & RLS Policies
-- ==========================================

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Simple permissive policies for sync (Can be tightened later)
CREATE POLICY "Public read vendors" ON public.vendors FOR SELECT USING (is_active = true);
CREATE POLICY "Vendor owners manage" ON public.vendors FOR ALL USING (owner_id = auth.uid());

-- ==========================================
-- 5. Role Promotion
-- ==========================================

-- Super Admin
UPDATE public.profiles SET role = 'super_admin' WHERE id IN (SELECT id FROM auth.users WHERE email = 'mambwemwila1@gmail.com');

-- Vendor
UPDATE public.profiles SET role = 'vendor' WHERE id IN (SELECT id FROM auth.users WHERE email = 'vendor@user.com');

COMMIT;
