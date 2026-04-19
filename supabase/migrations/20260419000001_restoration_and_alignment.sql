-- Restoration and Alignment Migration
-- This script restores the missing tables and renamed profiles to align with the frontend.

BEGIN;

-- 1. Rename profiles to user_profiles
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        ALTER TABLE public.profiles RENAME TO user_profiles;
    END IF;
END $$;

-- 2. Restore activity_logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id bigserial PRIMARY KEY,
    user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    user_email text,
    logged_by uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    activity_type text NOT NULL,
    resource_type text,
    resource_id bigint,
    additional_details jsonb DEFAULT '{}',
    ip_address text,
    user_agent text,
    risk_score integer DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
    log_source text DEFAULT 'user_action',
    created_at timestamptz DEFAULT now()
);

-- 3. Restore audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name text NOT NULL,
    record_id uuid,
    action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    old_values jsonb,
    new_values jsonb,
    user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    ip_address text,
    user_agent text,
    created_at timestamptz DEFAULT now()
);

-- 4. Restore system_metrics
CREATE TABLE IF NOT EXISTS public.system_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name text NOT NULL,
    metric_value numeric NOT NULL,
    metric_unit text,
    tags jsonb DEFAULT '{}',
    recorded_at timestamptz DEFAULT now()
);

-- 5. Restore payments
CREATE TABLE IF NOT EXISTS public.payments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    order_id bigint NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    provider text NOT NULL DEFAULT 'vesicash',
    vesicash_transaction_id text,
    vesicash_payment_id text,
    status text NOT NULL DEFAULT 'pending',
    amount_usd numeric(12,2),
    amount_zmw numeric(12,2),
    exchange_rate numeric(12,4),
    base_currency text DEFAULT 'USD',
    quote_currency text DEFAULT 'ZMW',
    fx_rate_provider text,
    fx_rate_source text,
    fx_rate_fetched_at timestamptz,
    fx_rate_locked_at timestamptz,
    fx_rate_payload jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT payments_pkey PRIMARY KEY (id)
);

-- 6. Restore user_carts and cart_items
CREATE TABLE IF NOT EXISTS public.user_carts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT user_carts_user_id_key UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.cart_items (
    id bigserial PRIMARY KEY,
    cart_id uuid NOT NULL REFERENCES public.user_carts(id) ON DELETE CASCADE,
    product_id bigint NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- 7. Restore categories.is_active
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'is_active') THEN
        ALTER TABLE public.categories ADD COLUMN is_active boolean DEFAULT true;
    END IF;
END $$;

-- 8. Restore inventory (to satisfy old joins)
CREATE TABLE IF NOT EXISTS public.inventory (
    id bigserial PRIMARY KEY,
    product_id bigint NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    vendor_id uuid,
    quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    threshold integer DEFAULT 5,
    last_restocked timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT inventory_product_id_key UNIQUE (product_id)
);

-- 9. Grant Permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- 10. Restore RPC: record_metric
CREATE OR REPLACE FUNCTION public.record_metric(
    p_name text,
    p_value numeric,
    p_unit text DEFAULT NULL,
    p_tags jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.system_metrics (metric_name, metric_value, metric_unit, tags)
    VALUES (p_name, p_value, p_unit, p_tags);
END;
$$;

-- 11. Restore RPC: create_order_from_cart (Updated to use products/inventory sync)
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
    v_order_number text;
BEGIN
    -- Get user cart
    SELECT id INTO v_cart_id FROM public.user_carts WHERE user_id = _user_id;

    IF v_cart_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.cart_items WHERE cart_id = v_cart_id) THEN
        RAISE EXCEPTION 'CART_EMPTY';
    END IF;

    -- Generate order number
    v_order_number := 'ORD-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    -- Create order
    INSERT INTO public.orders (
        user_id, order_number, status, total_amount, shipping_address
    ) VALUES (
        _user_id, v_order_number, 'pending', 0, _shipping_address
    ) RETURNING id INTO v_order_id;

    -- Process items
    FOR v_item IN
        SELECT ci.product_id, ci.quantity, p.price, p.stock_quantity
        FROM public.cart_items ci
        JOIN public.products p ON p.id = ci.product_id
        WHERE ci.cart_id = v_cart_id
    LOOP
        -- Simple stock check
        IF v_item.stock_quantity < v_item.quantity THEN
            RAISE EXCEPTION 'OUT_OF_STOCK: Product %', v_item.product_id;
        END IF;

        -- Update product stock
        UPDATE public.products 
        SET stock_quantity = stock_quantity - v_item.quantity 
        WHERE id = v_item.product_id;

        -- Sink into inventory table for legacy support
        INSERT INTO public.inventory (product_id, quantity)
        VALUES (v_item.product_id, v_item.stock_quantity - v_item.quantity)
        ON CONFLICT (product_id) DO UPDATE SET quantity = EXCLUDED.quantity;

        -- Create order item
        INSERT INTO public.order_items (order_id, product_id, quantity, price)
        VALUES (v_order_id, v_item.product_id, v_item.quantity, v_item.price);

        v_total_amount := v_total_amount + (v_item.price * v_item.quantity);
    END LOOP;

    -- Update order total
    UPDATE public.orders SET total_amount = v_total_amount WHERE id = v_order_id;

    -- Clear cart
    DELETE FROM public.cart_items WHERE cart_id = v_cart_id;

    RETURN v_order_id;
END;
$$;

COMMIT;
