
-- Create guest_carts table
CREATE TABLE IF NOT EXISTS public.guest_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(session_id)
);

-- Create guest_cart_items table
CREATE TABLE IF NOT EXISTS public.guest_cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_cart_id UUID NOT NULL REFERENCES public.guest_carts(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(guest_cart_id, product_id)
);

-- Enable RLS
ALTER TABLE public.guest_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_cart_items ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON public.guest_carts TO anon, authenticated, service_role;
GRANT ALL ON public.guest_cart_items TO anon, authenticated, service_role;

-- Policies
-- Allow anyone to create a guest cart (client generates session_id)
CREATE POLICY "Enable read/write for all on guest_carts" ON public.guest_carts
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Allow access to items if you have access to the cart (simplified for anon)
CREATE POLICY "Enable read/write for all on guest_cart_items" ON public.guest_cart_items
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Also ensure user_carts exists just in case
CREATE TABLE IF NOT EXISTS public.user_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id UUID NOT NULL REFERENCES public.user_carts(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(cart_id, product_id)
);

-- RLS for user carts
ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.user_carts TO authenticated, service_role;
GRANT ALL ON public.cart_items TO authenticated, service_role;

CREATE POLICY "Users can manage their own cart" ON public.user_carts
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own cart items" ON public.cart_items
    FOR ALL
    USING (cart_id IN (SELECT id FROM public.user_carts WHERE user_id = auth.uid()))
    WITH CHECK (cart_id IN (SELECT id FROM public.user_carts WHERE user_id = auth.uid()));
