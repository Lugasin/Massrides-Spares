-- PWA System Overhaul Migration
-- This migration implements the new vendor system, generic payments, guest checkout support, and mandatory states.

BEGIN;

-- 1. Vendor System
CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  logo_url text,
  contact_email text,
  contact_phone text,
  address jsonb,
  vesicash_recipient_id text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.vendor_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'staff' CHECK (role IN ('owner', 'admin', 'staff')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(vendor_id, user_id)
);

-- 2. Generic Payments Table (Replacing TJ-specific structure)
-- First, drop the old payments table if it exists or rename it
-- Since we want a fresh generic one as per instructions:
DROP TABLE IF EXISTS public.payments;

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id bigint NOT NULL, -- references orders(id)
  provider text NOT NULL DEFAULT 'vesicash',
  provider_reference text UNIQUE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'INITIATED', 'REDIRECTED', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED')),
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'ZMW',
  raw_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Orders Table Updates
-- Make user_id nullable for guest checkout
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

-- Add guest info fields
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name='orders' AND column_name='guest_email') THEN
        ALTER TABLE public.orders ADD COLUMN guest_email text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name='orders' AND column_name='guest_phone') THEN
        ALTER TABLE public.orders ADD COLUMN guest_phone text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name='orders' AND column_name='guest_session_id') THEN
        ALTER TABLE public.orders ADD COLUMN guest_session_id text;
    END IF;
END $$;

-- Update orders status check to include mandatory states
-- First, find and drop the existing constraint if it exists
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass AND contype = 'c' AND (consrc LIKE '%status%' OR conname LIKE '%status%');

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.orders DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- Data Migration: Update existing statuses to uppercase and map them
UPDATE public.orders SET status = 'PENDING' WHERE status IN ('pending_payment', 'awaiting_payment', 'pending');
UPDATE public.orders SET status = 'PAID' WHERE status IN ('paid');
UPDATE public.orders SET status = 'PROCESSING' WHERE status IN ('processing');
UPDATE public.orders SET status = 'SHIPPED' WHERE status IN ('shipped');
UPDATE public.orders SET status = 'DELIVERED' WHERE status IN ('delivered');
UPDATE public.orders SET status = 'CANCELLED' WHERE status IN ('cancelled', 'refunded');

ALTER TABLE public.orders ADD CONSTRAINT orders_status_check
CHECK (status IN ('PENDING', 'INITIATED', 'REDIRECTED', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'SHIPPED', 'DELIVERED'));

-- 4. Vendor Orders & Inventory Logs
CREATE TABLE IF NOT EXISTS public.vendor_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  order_id bigint REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(vendor_id, order_id)
);

CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id bigint NOT NULL, -- references products(id)
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  change_amount integer NOT NULL,
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 5. Email Logs
-- 5. Unify Cart System
-- Unify cart tables into a single 'carts' table with views for backward compatibility
DROP TABLE IF EXISTS public.cart_items CASCADE;
DROP TABLE IF EXISTS public.guest_cart_items CASCADE;
DROP TABLE IF EXISTS public.user_carts CASCADE;
DROP TABLE IF EXISTS public.guest_carts CASCADE;
DROP TABLE IF EXISTS public.carts CASCADE;

CREATE TABLE public.carts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    guest_session_id text,
    product_id bigint NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity integer NOT NULL CHECK (quantity > 0),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT carts_user_product_unique UNIQUE(user_id, product_id),
    CONSTRAINT carts_guest_product_unique UNIQUE(guest_session_id, product_id),
    CONSTRAINT carts_owner_check CHECK (
        (user_id IS NOT NULL AND guest_session_id IS NULL) OR
        (user_id IS NULL AND guest_session_id IS NOT NULL)
    )
);

-- Backward compatibility views (automatically updatable in PostgreSQL)
CREATE OR REPLACE VIEW public.cart_items AS
SELECT user_id, product_id, quantity, created_at
FROM public.carts
WHERE user_id IS NOT NULL;

CREATE OR REPLACE VIEW public.guest_cart_items AS
SELECT guest_session_id, product_id, quantity, created_at
FROM public.carts
WHERE guest_session_id IS NOT NULL;

-- Enable RLS on the base table
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own cart" ON public.carts FOR ALL USING (user_id = auth.uid() OR guest_session_id IS NOT NULL);

-- 6. Email Logs
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id bigint,
  recipient text NOT NULL,
  type text NOT NULL, -- e.g., 'ORDER_CREATED', 'PAYMENT_SUCCESS'
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
  error text,
  sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- 7. Notifications Update
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE table_name='notifications' AND column_name='role') THEN
        ALTER TABLE public.notifications ADD COLUMN role text;
    END IF;
END $$;

-- Update notification user_id to be nullable for role broadcasts
ALTER TABLE public.notifications ALTER COLUMN user_id DROP NOT NULL;

-- 7. Link Products to Vendors Table
-- Current products table has vendor_id uuid NOT NULL referencing auth.users(id)
-- We need to change this to reference public.vendors(id)

-- First, Create vendors for existing vendor users
INSERT INTO public.vendors (name, slug, contact_email, status)
SELECT
    COALESCE(full_name, 'Vendor ' || id),
    COALESCE(LOWER(REPLACE(full_name, ' ', '-')), 'vendor-' || id),
    email,
    'active'
FROM public.profiles
WHERE role = 'vendor'
ON CONFLICT (slug) DO NOTHING;

-- Link those users to their new vendors
INSERT INTO public.vendor_users (vendor_id, user_id, role)
SELECT v.id, p.id, 'owner'
FROM public.profiles p
JOIN public.vendors v ON v.contact_email = p.email
WHERE p.role = 'vendor'
ON CONFLICT DO NOTHING;

-- Now update products table.
-- We'll add a temporary column to hold the new vendor_id (uuid)
-- but wait, the old vendor_id was already uuid.
-- However, it referenced auth.users(id). Now it should reference public.vendors(id).

-- Drop the old foreign key constraint
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass AND contype = 'f' AND conkey = (SELECT array_agg(attnum) FROM pg_attribute WHERE attrelid = 'public.products'::regclass AND attname = 'vendor_id');

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.products DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

-- Data migration: Update product vendor_id to point to new vendor id
UPDATE public.products p
SET vendor_id = vu.vendor_id
FROM public.vendor_users vu
WHERE p.vendor_id = vu.user_id;

-- Add new foreign key
ALTER TABLE public.products ADD CONSTRAINT products_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;

-- Add foreign key to payments
ALTER TABLE public.payments ADD CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;

-- 8. RLS Policies
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Super Admin policy (assuming role is in profiles)
-- We need to check profiles table for role
-- Profiles table has role field.

-- Generic policy for public access or authenticated access
CREATE POLICY "Public vendors are viewable by everyone" ON public.vendors FOR SELECT USING (status = 'active');
CREATE POLICY "Super admins manage all vendors" ON public.vendors FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "Vendor users view their own vendors" ON public.vendor_users FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Super admins manage vendor_users" ON public.vendor_users FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- 9. Triggers for updated_at
CREATE TRIGGER update_vendors_updated_at BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_vendor_orders_updated_at BEFORE UPDATE ON public.vendor_orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 10. Link Guest Orders on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user_linking()
RETURNS TRIGGER AS $$
BEGIN
    -- Link guest orders matching by email OR phone
    UPDATE public.orders
    SET user_id = NEW.id
    WHERE user_id IS NULL
      AND (
        (guest_email = NEW.email AND guest_email IS NOT NULL) OR
        (guest_phone = NEW.phone AND guest_phone IS NOT NULL)
      );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created_link_orders
    AFTER INSERT ON public.profiles
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_linking();

COMMIT;
