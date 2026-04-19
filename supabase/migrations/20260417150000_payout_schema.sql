-- ==========================================
-- Phase 3: Financial Infrastructure (Payouts, Auditing, & Escrow)
-- ==========================================

BEGIN;

-- 1. Financial Audit Logs Table
CREATE TABLE IF NOT EXISTS public.financial_audit_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    event_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id text NOT NULL,
    amount numeric NOT NULL DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT financial_audit_logs_pkey PRIMARY KEY (id)
);

-- 2. Vendor Payouts Table
CREATE TABLE IF NOT EXISTS public.vendor_payouts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    vendor_id uuid NOT NULL,
    amount numeric NOT NULL CHECK (amount > 0),
    status text NOT NULL DEFAULT 'pending'::text,
    payout_reference text,
    failure_reason text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT vendor_payouts_pkey PRIMARY KEY (id),
    CONSTRAINT vendor_payouts_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES auth.users(id)
);

-- 3. Fix the RPC function type crash previously identified
DROP FUNCTION IF EXISTS public.create_order_from_cart(uuid, jsonb, text);

CREATE OR REPLACE FUNCTION public.create_order_from_cart(
    _user_id uuid,
    _shipping_address jsonb DEFAULT '{}'::jsonb,
    _payment_method text DEFAULT 'vesicash'
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cart_id uuid;
    v_order_id bigint;
    v_total_amount numeric := 0;
    v_item RECORD;
    v_inventory_qty integer;
    v_order_number text;
BEGIN
    -- Get user cart
    SELECT id INTO v_cart_id FROM public.user_carts WHERE user_id = _user_id;

    -- Auto-create cart if missing
    IF v_cart_id IS NULL THEN
        INSERT INTO public.user_carts (user_id) VALUES (_user_id) RETURNING id INTO v_cart_id;
        RAISE EXCEPTION 'CART_EMPTY: Cart was missing and has been created empty.';
    END IF;

    -- Check if cart has items
    IF NOT EXISTS (SELECT 1 FROM public.cart_items WHERE cart_id = v_cart_id) THEN
         RAISE EXCEPTION 'CART_EMPTY: No items in cart.';
    END IF;

    -- Generate order number
    v_order_number := 'ORD-' || floor(extract(epoch from now())) || '-' || floor(random() * 1000);

    -- Create order
    INSERT INTO public.orders (
        user_id, order_number, status, payment_status, shipping_address, total_amount
    ) VALUES (
        _user_id, v_order_number, 'pending', 'unpaid', _shipping_address, 0
    ) RETURNING id INTO v_order_id;

    -- Process cart items
    FOR v_item IN
        SELECT ci.quantity, ci.product_id, p.price, p.vendor_id, p.stock_quantity
        FROM public.cart_items ci
        JOIN public.products p ON p.id = ci.product_id
        WHERE ci.cart_id = v_cart_id
    LOOP
        -- Inventory check and update
        SELECT quantity INTO v_inventory_qty FROM public.inventory
        WHERE product_id = v_item.product_id FOR UPDATE;

        IF v_inventory_qty IS NULL THEN
            INSERT INTO public.inventory (product_id, vendor_id, quantity)
            VALUES (v_item.product_id, v_item.vendor_id, v_item.stock_quantity)
            RETURNING quantity INTO v_inventory_qty;
        END IF;

        IF v_inventory_qty < v_item.quantity THEN
            RAISE EXCEPTION 'OUT_OF_STOCK: Product ID %, Available %, Requested %',
                v_item.product_id, v_inventory_qty, v_item.quantity;
        END IF;

        -- Update inventory
        UPDATE public.inventory SET quantity = quantity - v_item.quantity
        WHERE product_id = v_item.product_id;

        -- Update product stock (keep in sync)
        UPDATE public.products SET stock_quantity = stock_quantity - v_item.quantity
        WHERE id = v_item.product_id;

        -- Create order item
        INSERT INTO public.order_items (order_id, product_id, quantity, price_snapshot)
        VALUES (v_order_id, v_item.product_id, v_item.quantity, v_item.price);

        -- Calculate total
        v_total_amount := v_total_amount + (v_item.price * v_item.quantity);
    END LOOP;

    -- Update order total
    UPDATE public.orders SET total_amount = v_total_amount WHERE id = v_order_id;

    -- Clear cart
    DELETE FROM public.cart_items WHERE cart_id = v_cart_id;

    RETURN v_order_id;
END;
$$;

-- 4. RLS Policies
ALTER TABLE public.vendor_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_audit_logs ENABLE ROW LEVEL SECURITY;

-- Vendors can view own payouts
DROP POLICY IF EXISTS "Vendors manage own payouts" ON public.vendor_payouts;
CREATE POLICY "Vendors manage own payouts" ON public.vendor_payouts FOR SELECT USING (vendor_id = auth.uid());

-- Service role bypasses RLS
GRANT ALL ON TABLE public.vendor_payouts TO service_role;
GRANT ALL ON TABLE public.financial_audit_logs TO service_role;
GRANT ALL ON TABLE public.orders TO service_role;
GRANT ALL ON TABLE public.order_items TO service_role;
GRANT ALL ON TABLE public.inventory TO service_role;
GRANT ALL ON TABLE public.payments TO service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

COMMIT;
