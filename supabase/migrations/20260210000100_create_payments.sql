-- Create Payments Table
CREATE TABLE IF NOT EXISTS public.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    currency text DEFAULT 'ZMW',
    status text DEFAULT 'pending', -- pending, paid, failed, refunded
    merchant_reference text,
    payment_method text,
    provider text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies

-- 1. Customers can view their own payments via orders
CREATE POLICY "Customers can view own payments" ON public.payments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.orders
            WHERE orders.id = payments.order_id
            AND orders.user_id = public.uid()
        )
    );

-- 2. Vendors can view payments for orders containing their items
-- Note: This allows seeing the FULL payment amount even if they only sold 1 item.
-- In a real multi-vendor system, you might want 'payouts' table instead.
-- But for now, seeing the transaction status is useful.
CREATE POLICY "Vendors can view payments for their orders" ON public.payments
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.order_items
            JOIN public.spare_parts ON spare_parts.id = order_items.spare_part_id
            WHERE order_items.order_id = payments.order_id
            AND spare_parts.vendor_id = public.uid()
        )
    );

-- 3. Admins can view all payments
CREATE POLICY "Admins can view all payments" ON public.payments
    FOR ALL TO authenticated
    USING (public.has_role('admin') OR public.has_role('super_admin'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_merchant_ref ON public.payments(merchant_reference);
