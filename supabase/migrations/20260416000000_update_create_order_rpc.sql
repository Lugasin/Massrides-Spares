CREATE OR REPLACE FUNCTION public.create_order_from_cart(
    _user_id uuid,
    _shipping_address jsonb,
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
    -- Try to find user cart
    SELECT id INTO v_cart_id FROM public.user_carts WHERE user_id = _user_id;

    -- If no items in user cart, check if it was a guest cart (guest_session_id passed in shipping_address)
    IF v_cart_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.cart_items WHERE cart_id = v_cart_id) THEN
        -- This logic can be expanded if we want to handle guest carts in RPC
        -- For now, we assume create-order function handles guest cart retrieval and passes a temporary user if needed
        -- Or just throw error if user cart is empty
        IF v_cart_id IS NULL THEN
            RAISE EXCEPTION 'CART_EMPTY';
        END IF;
    END IF;

    v_order_number := 'ORD-' || floor(extract(epoch from now())) || '-' || floor(random() * 1000);

    -- Calculate total
    SELECT SUM(p.price * ci.quantity) INTO v_total_amount
    FROM public.cart_items ci
    JOIN public.products p ON p.id = ci.product_id
    WHERE ci.cart_id = v_cart_id;

    -- Create Order
    INSERT INTO public.orders (
        user_id, order_number, status, payment_status, shipping_address, total_amount
    ) VALUES (
        _user_id, v_order_number, 'pending', 'unpaid', _shipping_address, v_total_amount
    ) RETURNING id INTO v_order_id;

    -- Move Items
    INSERT INTO public.order_items (order_id, product_id, quantity, price_snapshot)
    SELECT v_order_id, product_id, quantity, p.price
    FROM public.cart_items ci
    JOIN public.products p ON p.id = ci.product_id
    WHERE ci.cart_id = v_cart_id;

    -- Clear Cart
    DELETE FROM public.cart_items WHERE cart_id = v_cart_id;

    RETURN v_order_id;
END;
$$ ;
