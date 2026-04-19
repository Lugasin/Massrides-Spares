-- Comprehensive Orders Table Alignment
-- Adds missing columns expected by both the frontend and legacy Edge Functions

BEGIN;

-- 1. Add missing columns to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'vesicash',
ADD COLUMN IF NOT EXISTS shipping_method text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS customer_email text; -- Redundant but safe if migration 7 failed

-- 2. Ensure user_id is nullable (for guest reconciliation)
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

-- 3. Sync RPC to handle new columns
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
    v_cart_record RECORD;
    v_order_id bigint;
    v_total_amount numeric := 0;
    v_item jsonb;
    v_product_id bigint;
    v_quantity int;
    v_price numeric;
    v_stock int;
    v_order_number text;
BEGIN
    -- 1. Fetch the JSONB cart for the user
    SELECT * INTO v_cart_record FROM public.carts WHERE user_id = _user_id;

    IF v_cart_record IS NULL OR v_cart_record.items IS NULL OR jsonb_array_length(v_cart_record.items) = 0 THEN
        RAISE EXCEPTION 'CART_EMPTY';
    END IF;

    -- 2. Generate order number
    v_order_number := 'ORD-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    -- 3. Create order record with ALL expected columns
    INSERT INTO public.orders (
        user_id, 
        order_number, 
        status, 
        payment_status, 
        payment_method,
        total_amount, 
        shipping_address,
        currency
    ) VALUES (
        _user_id, 
        v_order_number, 
        'pending', 
        'pending',
        _payment_method,
        0, 
        _shipping_address,
        'USD'
    ) RETURNING id INTO v_order_id;

    -- 4. Process items
    FOR v_item IN SELECT jsonb_array_elements(v_cart_record.items) LOOP
        v_product_id := (v_item->>'product_id')::bigint;
        v_quantity := (v_item->>'quantity')::int;

        SELECT price, stock_quantity INTO v_price, v_stock 
        FROM public.products 
        WHERE id = v_product_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'PRODUCT_NOT_FOUND: %', v_product_id;
        END IF;

        IF v_stock < v_quantity THEN
            RAISE EXCEPTION 'OUT_OF_STOCK: Product %', v_product_id;
        END IF;

        UPDATE public.products 
        SET stock_quantity = stock_quantity - v_quantity 
        WHERE id = v_product_id;

        INSERT INTO public.order_items (order_id, product_id, quantity, price)
        VALUES (v_order_id, v_product_id, v_quantity, v_price);

        v_total_amount := v_total_amount + (v_price * v_quantity);
    END LOOP;

    -- 5. Finalize
    UPDATE public.orders SET total_amount = v_total_amount WHERE id = v_order_id;

    -- 6. Clear cart
    UPDATE public.carts SET items = '[]'::jsonb WHERE id = v_cart_record.id;

    RETURN v_order_id;
END;
$$;

COMMIT;
