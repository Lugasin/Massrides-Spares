-- Phase 1: Safety & Backups (Idempotent)
DO $$
BEGIN
    -- Backup spare_parts/inventory
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'backup_spare_parts') AND EXISTS (SELECT FROM pg_tables WHERE tablename = 'spare_parts') THEN
        CREATE TABLE backup_spare_parts AS SELECT * FROM spare_parts;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'backup_inventory') AND EXISTS (SELECT FROM pg_tables WHERE tablename = 'inventory') THEN
        CREATE TABLE backup_inventory AS SELECT * FROM inventory;
    END IF;
    -- Backup carts/orders
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'backup_carts') AND EXISTS (SELECT FROM pg_tables WHERE tablename = 'carts') THEN
        CREATE TABLE backup_carts AS SELECT * FROM carts;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'backup_cart_items') AND EXISTS (SELECT FROM pg_tables WHERE tablename = 'cart_items') THEN
        CREATE TABLE backup_cart_items AS SELECT * FROM cart_items;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'backup_orders') AND EXISTS (SELECT FROM pg_tables WHERE tablename = 'orders') THEN
        CREATE TABLE backup_orders AS SELECT * FROM orders;
    END IF;
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'backup_payments') AND EXISTS (SELECT FROM pg_tables WHERE tablename = 'payments') THEN
        CREATE TABLE backup_payments AS SELECT * FROM payments;
    END IF;
END $$;

-- Phase 2: Schema Alignment & Production Structure

-- Ensure profiles has role column
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role text DEFAULT 'customer' CHECK (role IN ('customer', 'vendor', 'admin', 'super_admin'));

-- Ensure orders has vendor_id and financial fields
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id),
ADD COLUMN IF NOT EXISTS platform_fee numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS vendor_earning numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payout_status text DEFAULT 'unpaid' CHECK (payout_status IN ('unpaid', 'locked', 'processing', 'paid_out')),
ADD COLUMN IF NOT EXISTS payout_id uuid,
ADD COLUMN IF NOT EXISTS fraud_flag boolean DEFAULT false;

-- Ensure payments has Vesicash fields
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS vesicash_transaction_id text,
ADD COLUMN IF NOT EXISTS vesicash_payment_id text,
ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Create Payouts table
CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id),
  total_amount numeric NOT NULL,
  total_orders integer DEFAULT 0,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected')),
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid REFERENCES public.profiles(id),
  notes text
);

-- Create Disputes table
CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id),
  user_id uuid REFERENCES public.profiles(id),
  vendor_id uuid REFERENCES public.vendors(id),
  reason text,
  status text DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved_refund', 'resolved_vendor_win', 'rejected')),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Create Financial Audit Logs table (for Super Admin dashboard)
CREATE TABLE IF NOT EXISTS public.financial_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  entity_type text,
  entity_id text,
  amount numeric,
  actor_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Create Super Admin Financial Summary View
CREATE OR REPLACE VIEW public.super_admin_financial_summary AS
SELECT
  COALESCE(SUM(platform_fee), 0) as total_commission_recorded,
  COALESCE(SUM(total_amount), 0) as total_volume_released,
  (SELECT COUNT(*) FROM public.payouts WHERE status = 'pending') as pending_payouts
FROM public.orders
WHERE payment_status = 'paid';

-- Phase 5: RPC Functions (Atomic & Business Logic)

-- 1. Atomic Order Creation
CREATE OR REPLACE FUNCTION public.create_order_from_cart(
  _user_id uuid,
  _shipping_address jsonb
)
RETURNS bigint
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id bigint;
  v_total numeric := 0;
  v_item RECORD;
BEGIN
  -- Lock inventory rows
  FOR v_item IN
    SELECT ci.quantity, ci.spare_part_id, i.quantity AS stock
    FROM public.cart_items ci
    JOIN public.inventory i ON i.product_id = ci.spare_part_id
    WHERE ci.user_id = _user_id
    FOR UPDATE OF i
  LOOP
    IF v_item.quantity > v_item.stock THEN
      RAISE EXCEPTION 'OUT_OF_STOCK: Product %', v_item.spare_part_id;
    END IF;
  END LOOP;

  -- Create order (with default status)
  INSERT INTO public.orders (
    user_id,
    status,
    payment_status,
    shipping_address,
    total_amount
  )
  VALUES (
    _user_id,
    'awaiting_payment',
    'unpaid',
    _shipping_address,
    0
  )
  RETURNING id INTO v_order_id;

  -- Insert order items and update inventory
  FOR v_item IN
    SELECT ci.quantity, ci.spare_part_id, sp.price, sp.vendor_id
    FROM public.cart_items ci
    JOIN public.spare_parts sp ON sp.id = ci.spare_part_id
    WHERE ci.user_id = _user_id
  LOOP
    INSERT INTO public.order_items (
      order_id,
      spare_part_id,
      quantity,
      price
    )
    VALUES (
      v_order_id,
      v_item.spare_part_id,
      v_item.quantity,
      v_item.price
    );

    -- Decrement inventory (inventory.product_id references spare_parts.id)
    UPDATE public.inventory
    SET quantity = quantity - v_item.quantity
    WHERE product_id = v_item.spare_part_id;

    v_total := v_total + (v_item.quantity * v_item.price);
  END LOOP;

  -- Update order total
  UPDATE public.orders
  SET total_amount = v_total
  WHERE id = v_order_id;

  -- Clear cart
  DELETE FROM public.cart_items WHERE user_id = _user_id;

  RETURN v_order_id;
END;
$$;

-- 2. Get Vendor Available Balance
CREATE OR REPLACE FUNCTION public.get_vendor_available_balance(v_id uuid)
RETURNS numeric
LANGUAGE sql
AS $$
  SELECT COALESCE(SUM(vendor_earning), 0)
  FROM public.orders
  WHERE vendor_id = v_id
  AND payment_status = 'paid'
  AND payout_status = 'unpaid';
$$;

-- 3. Create Payout Batch
CREATE OR REPLACE FUNCTION public.create_payout_batch(v_id uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  payout_uuid uuid;
BEGIN
  INSERT INTO public.payouts (vendor_id, total_amount, total_orders)
  SELECT
    v_id,
    COALESCE(SUM(vendor_earning), 0),
    COUNT(*)
  FROM public.orders
  WHERE vendor_id = v_id
  AND payment_status = 'paid'
  AND payout_status = 'unpaid'
  RETURNING id INTO payout_uuid;

  UPDATE public.orders
  SET payout_status = 'locked',
      payout_id = payout_uuid
  WHERE vendor_id = v_id
  AND payment_status = 'paid'
  AND payout_status = 'unpaid';

  RETURN payout_uuid;
END;
$$;

-- 4. Complete Payout
CREATE OR REPLACE FUNCTION public.complete_payout(p_id uuid, admin_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.payouts
  SET status = 'completed',
      processed_at = now(),
      processed_by = admin_id
  WHERE id = p_id;

  UPDATE public.orders
  SET payout_status = 'paid_out'
  WHERE payout_id = p_id;
END;
$$;

-- 5. Helper: Is Super Admin
CREATE OR REPLACE FUNCTION public.is_super_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role = 'super_admin' FROM public.profiles WHERE id = uid;
$$;

-- 6. Helper: Increment Inventory (Rollback)
CREATE OR REPLACE FUNCTION public.increment_inventory(p_id uuid, qty integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.inventory
  SET quantity = quantity + qty
  WHERE product_id = p_id;
$$;

-- Phase 6: RLS & Policies (Hardened)

-- Enable RLS on new tables
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_audit_logs ENABLE ROW LEVEL SECURITY;

-- Super Admin Full Access Policy (Generic)

-- Orders: Users see own, Vendors see theirs, Super Admin sees all
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Vendors can view assigned orders" ON public.orders;
CREATE POLICY "Vendors can view assigned orders" ON public.orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = orders.vendor_id AND v.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "Super admin full access orders" ON public.orders;
CREATE POLICY "Super admin full access orders" ON public.orders
  FOR ALL USING (public.is_super_admin(auth.uid()));

-- Payouts: Vendors see own, Super Admin sees all
CREATE POLICY "Vendors view own payouts" ON public.payouts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = payouts.vendor_id AND v.owner_id = auth.uid())
  );

CREATE POLICY "Super admin manage payouts" ON public.payouts
  FOR ALL USING (public.is_super_admin(auth.uid()));

-- Financial Audit Logs: Super Admin only
CREATE POLICY "Super admin view audit logs" ON public.financial_audit_logs
  FOR SELECT USING (public.is_super_admin(auth.uid()));

-- Grant permissions to authenticated users for views if needed
GRANT SELECT ON public.super_admin_financial_summary TO authenticated;
