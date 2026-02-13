-- Create Orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    order_number text NOT NULL,
    user_id uuid REFERENCES public.user_profiles(id),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
    payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'pending', 'paid', 'failed', 'refunded')),
    total_amount numeric DEFAULT 0,
    shipping_address jsonb,
    billing_address jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT orders_pkey PRIMARY KEY (id)
);

-- Create Order Items table
CREATE TABLE IF NOT EXISTS public.order_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    spare_part_id uuid REFERENCES public.spare_parts(id),
    product_name text, -- Snapshot
    quantity numeric NOT NULL DEFAULT 1,
    price numeric NOT NULL DEFAULT 0, -- Snapshot unit price
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT order_items_pkey PRIMARY KEY (id)
);

-- RLS Policies
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Orders Policies
CREATE POLICY "Users can view own orders" ON public.orders
    FOR SELECT USING (user_id = public.uid());

CREATE POLICY "Users can create own orders" ON public.orders
    FOR INSERT WITH CHECK (user_id = public.uid());

CREATE POLICY "Admins can view all orders" ON public.orders
    FOR SELECT USING (public.has_role('admin') OR public.has_role('super_admin'));

CREATE POLICY "Admins can update all orders" ON public.orders
    FOR UPDATE USING (public.has_role('admin') OR public.has_role('super_admin'));

-- Order Items Policies
CREATE POLICY "Users can view own order items" ON public.order_items
    FOR SELECT USING (order_id IN (SELECT id FROM public.orders WHERE user_id = public.uid()));
    
CREATE POLICY "Admins can view all order items" ON public.order_items
    FOR SELECT USING (public.has_role('admin') OR public.has_role('super_admin'));
