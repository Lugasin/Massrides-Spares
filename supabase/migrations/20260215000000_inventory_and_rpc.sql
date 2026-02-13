-- Migration: Inventory System & Atomic Order RPC
-- Description: Separates inventory from product details and adds transactional order creation.

-- 1. Create Inventory Table
CREATE TABLE IF NOT EXISTS public.inventory (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id uuid REFERENCES public.spare_parts(id) ON DELETE CASCADE,
    vendor_id uuid REFERENCES public.user_profiles(id),
    quantity integer DEFAULT 0 CHECK (quantity >= 0),
    allow_backorder boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT inventory_product_id_key UNIQUE (product_id)
);

-- Enable RLS
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- Inventory Policies
CREATE POLICY "Public read inventory" ON public.inventory FOR SELECT USING (true);
CREATE POLICY "Vendors manage own inventory" ON public.inventory FOR ALL USING (vendor_id = auth.uid());

-- 2. Backfill Inventory from Spare Parts
INSERT INTO public.inventory (product_id, vendor_id, quantity)
SELECT id, vendor_id, stock_quantity
FROM public.spare_parts
ON CONFLICT (product_id) DO UPDATE 
SET quantity = EXCLUDED.quantity;

-- 3. Atomic Order Creation RPC
CREATE OR REPLACE FUNCTION public.create_order_from_cart(
    _user_id uuid,
    _shipping_address jsonb,
    _payment_method text DEFAULT 'vesicash'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_cart_id uuid;
    v_order_id uuid;
    v_total_amount numeric := 0;
    v_item RECORD;
    v_inventory_qty integer;
    v_order_number text;
BEGIN
    -- Get User Cart
    SELECT id INTO v_cart_id FROM public.user_carts WHERE user_id = _user_id;
    
    IF v_cart_id IS NULL THEN
        RAISE EXCEPTION 'CART_NOT_FOUND';
    END IF;

    -- Generate Order Number
    v_order_number := 'ORD-' || floor(extract(epoch from now())) || '-' || floor(random() * 1000);

    -- Create Order Shell (Pending)
    INSERT INTO public.orders (
        user_id,
        order_number,
        status,
        payment_status,
        shipping_address,
        total_amount
    ) VALUES (
        _user_id,
        v_order_number,
        'pending', -- Initial state
        'unpaid',
        _shipping_address,
        0 -- Will update later
    ) RETURNING id INTO v_order_id;

    -- Process Items: Lock Inventory & Insert Order Items
    FOR v_item IN 
        SELECT 
            ci.quantity, 
            ci.spare_part_id, 
            sp.price,
            sp.vendor_id
        FROM public.cart_items ci
        JOIN public.spare_parts sp ON sp.id = ci.spare_part_id
        WHERE ci.cart_id = v_cart_id
    LOOP
        -- Check & Update Inventory
        SELECT quantity INTO v_inventory_qty 
        FROM public.inventory 
        WHERE product_id = v_item.spare_part_id 
        FOR UPDATE; -- Lock row

        IF v_inventory_qty IS NULL THEN
            -- If not in inventory table, fallback to spare_parts or error?
            -- For now, initialize it if missing (safety net)
             INSERT INTO public.inventory (product_id, vendor_id, quantity)
             VALUES (v_item.spare_part_id, v_item.vendor_id, 0)
             RETURNING quantity INTO v_inventory_qty;
        END IF;

        IF v_inventory_qty < v_item.quantity THEN
            RAISE EXCEPTION 'OUT_OF_STOCK: Product %', v_item.spare_part_id;
        END IF;

        -- Decrement Inventory
        UPDATE public.inventory 
        SET quantity = quantity - v_item.quantity
        WHERE product_id = v_item.spare_part_id;

        -- Sync legacy column just in case (optional, remove later)
        UPDATE public.spare_parts
        SET stock_quantity = stock_quantity - v_item.quantity
        WHERE id = v_item.spare_part_id;

        -- Insert Order Item
        INSERT INTO public.order_items (
            order_id,
            spare_part_id,
            quantity,
            price
        ) VALUES (
            v_order_id,
            v_item.spare_part_id,
            v_item.quantity,
            v_item.price
        );

        -- Accumulate Total
        v_total_amount := v_total_amount + (v_item.price * v_item.quantity);
    END LOOP;

    -- Update Order Total
    UPDATE public.orders 
    SET total_amount = v_total_amount 
    WHERE id = v_order_id;

    -- Clear Cart
    DELETE FROM public.cart_items WHERE cart_id = v_cart_id;

    RETURN v_order_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_order_from_cart(uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_from_cart(uuid, jsonb, text) TO service_role;
