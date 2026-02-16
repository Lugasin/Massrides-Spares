-- Fix create_order_from_cart RPC Function
-- ROOT CAUSE: The function declares v_order_id as UUID, but orders.id is BIGINT.
-- When INSERT INTO orders ... RETURNING id INTO v_order_id runs,
-- Postgres tries to store a bigint (like "5") into a uuid variable → crash.
--
-- FIX: Change v_order_id from uuid to bigint, and RETURNS from uuid to bigint.

-- Drop old function first (must match old signature exactly)
DROP FUNCTION IF EXISTS public.create_order_from_cart(uuid, jsonb, text);

-- Recreate with correct types
CREATE OR REPLACE FUNCTION public.create_order_from_cart(
    _user_id uuid,
    _shipping_address jsonb DEFAULT '{}'::jsonb,
    _payment_method text DEFAULT 'vesicash'
)
RETURNS bigint  -- ✅ FIXED: was uuid, now bigint to match orders.id
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cart_id uuid;
    v_order_id bigint;  -- ✅ FIXED: was uuid, now bigint to match orders.id
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
    ) RETURNING id INTO v_order_id;  -- ✅ Now stores bigint correctly

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

        -- If no inventory record exists, create one with current stock
        IF v_inventory_qty IS NULL THEN
            INSERT INTO public.inventory (product_id, vendor_id, quantity)
            VALUES (v_item.product_id, v_item.vendor_id, v_item.stock_quantity)
            RETURNING quantity INTO v_inventory_qty;
        END IF;

        -- Check stock availability
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

    RETURN v_order_id;  -- ✅ Returns bigint
END;
$$;
