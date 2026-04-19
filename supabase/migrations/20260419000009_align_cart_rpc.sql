-- Align Order Creation with JSONB Cart System
-- Drops legacy normalized cart tables and updates RPC to use the JSONB 'carts' table

BEGIN;

-- 1. Drop defunct legacy tables (Consolidating to JSONB 'carts')
DROP TABLE IF EXISTS public.cart_items CASCADE;
DROP TABLE IF EXISTS public.user_carts CASCADE;

-- 2. Update create_order_from_cart RPC
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

    -- 3. Create initial order record
    INSERT INTO public.orders (
        user_id, order_number, status, total_amount, shipping_address
    ) VALUES (
        _user_id, v_order_number, 'pending', 0, _shipping_address
    ) RETURNING id INTO v_order_id;

    -- 4. Process each item in the JSONB array
    FOR v_item IN SELECT jsonb_array_elements(v_cart_record.items) LOOP
        v_product_id := (v_item->>'product_id')::bigint;
        v_quantity := (v_item->>'quantity')::int;

        -- Get current product info
        SELECT price, stock_quantity INTO v_price, v_stock 
        FROM public.products 
        WHERE id = v_product_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'PRODUCT_NOT_FOUND: %', v_product_id;
        END IF;

        IF v_stock < v_quantity THEN
            RAISE EXCEPTION 'OUT_OF_STOCK: Product %', v_product_id;
        END IF;

        -- Update product stock
        UPDATE public.products 
        SET stock_quantity = stock_quantity - v_quantity 
        WHERE id = v_product_id;

        -- Create order item
        INSERT INTO public.order_items (order_id, product_id, quantity, price)
        VALUES (v_order_id, v_product_id, v_quantity, v_price);

        -- Accumulate total
        v_total_amount := v_total_amount + (v_price * v_quantity);
    END LOOP;

    -- 5. Finalize order total
    UPDATE public.orders SET total_amount = v_total_amount WHERE id = v_order_id;

    -- 6. Clear the cart in the database
    UPDATE public.carts SET items = '[]'::jsonb WHERE id = v_cart_record.id;

    RETURN v_order_id;
END;
$$;

COMMIT;
