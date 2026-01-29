-- Security and Audit Fixes Migration
-- Implements missing audit tables and comprehensive RLS policies.

BEGIN;

-- 1. Missing Audit Tables
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_type text,
  payload jsonb,
  processed boolean DEFAULT false,
  error text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES public.payments(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- 2. Enhanced RLS Policies

-- Clear existing policies to avoid conflicts
DO $$
BEGIN
    -- Orders
    DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
    DROP POLICY IF EXISTS "Users create orders" ON public.orders;
    DROP POLICY IF EXISTS "Vendors view their orders" ON public.orders;
    DROP POLICY IF EXISTS "Admins view all orders" ON public.orders;
    DROP POLICY IF EXISTS "Guests create orders" ON public.orders;

    -- Payments
    DROP POLICY IF EXISTS "Users view own payments" ON public.payments;
    DROP POLICY IF EXISTS "Admins view all payments" ON public.payments;

    -- Vendor Orders
    DROP POLICY IF EXISTS "Vendors view own vendor_orders" ON public.vendor_orders;
    DROP POLICY IF EXISTS "Vendors update own vendor_orders" ON public.vendor_orders;

    -- Notifications
    DROP POLICY IF EXISTS "Users manage own notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Role based notifications" ON public.notifications;

    -- Products
    DROP POLICY IF EXISTS "Public view active products" ON public.products;
    DROP POLICY IF EXISTS "Vendors manage own products" ON public.products;
END $$;

-- --- ORDERS ---
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Guests/Customers can create orders (NULL user_id for guests is allowed)
CREATE POLICY "Anyone can create orders" ON public.orders
FOR INSERT WITH CHECK (true);

-- Users can view their own orders
CREATE POLICY "Users view own orders" ON public.orders
FOR SELECT USING (auth.uid() = user_id);

-- Vendors can view orders that contain their products
CREATE POLICY "Vendors view their orders" ON public.orders
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.vendor_orders vo
    JOIN public.vendor_users vu ON vo.vendor_id = vu.vendor_id
    WHERE vo.order_id = public.orders.id AND vu.user_id = auth.uid()
  )
);

-- Admins view all
CREATE POLICY "Admins view all orders" ON public.orders
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- --- ORDER ITEMS ---
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create order items" ON public.order_items
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users view own order items" ON public.order_items
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.user_id = auth.uid() OR o.guest_session_id IS NOT NULL))
);

CREATE POLICY "Vendors view their order items" ON public.order_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.products p
    JOIN public.vendor_users vu ON p.vendor_id = vu.vendor_id
    WHERE p.id = public.order_items.product_id AND vu.user_id = auth.uid()
  )
);

-- --- PAYMENTS ---
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payments" ON public.payments
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);

CREATE POLICY "Admins view all payments" ON public.payments
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- --- VENDOR ORDERS ---
ALTER TABLE public.vendor_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors view own vendor_orders" ON public.vendor_orders
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.vendor_users vu WHERE vu.vendor_id = public.vendor_orders.vendor_id AND vu.user_id = auth.uid())
);

CREATE POLICY "Vendors update own vendor_orders" ON public.vendor_orders
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.vendor_users vu WHERE vu.vendor_id = public.vendor_orders.vendor_id AND vu.user_id = auth.uid())
);

-- --- INVENTORY LOGS ---
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors manage own logs" ON public.inventory_logs
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.vendor_users vu WHERE vu.vendor_id = public.inventory_logs.vendor_id AND vu.user_id = auth.uid())
);

-- --- NOTIFICATIONS ---
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own or role notifications" ON public.notifications
FOR SELECT USING (
  user_id = auth.uid() OR
  (role IS NOT NULL AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()))
);

CREATE POLICY "Users update own notifications" ON public.notifications
FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- --- PRODUCTS ---
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view active products" ON public.products
FOR SELECT USING (is_active = true);

CREATE POLICY "Vendors manage own products" ON public.products
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.vendor_users vu WHERE vu.vendor_id = public.products.vendor_id AND vu.user_id = auth.uid())
);

-- --- WEBHOOK EVENTS & EMAIL LOGS ---
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view webhook events" ON public.webhook_events
FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

CREATE POLICY "Admins view email logs" ON public.email_logs
FOR SELECT USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));


-- 3. Triggers for Payment Logs
CREATE OR REPLACE FUNCTION public.log_payment_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO public.payment_logs (payment_id, from_status, to_status)
        VALUES (NEW.id, OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_payment_status_change
    AFTER UPDATE ON public.payments
    FOR EACH ROW EXECUTE PROCEDURE public.log_payment_status_change;

-- 4. Fix profiles for vendors
-- Ensure vendor profiles have correct role and can be created
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

COMMIT;
