-- Fix RLS policies for user_carts and cart_items
-- The existing policy references the old 'user_profiles' table which no longer exists
-- This creates simple, correct policies using auth.uid() directly

-- user_carts: users can manage their own cart
ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to manage their own cart" ON public.user_carts;
DROP POLICY IF EXISTS "Users can manage own cart" ON public.user_carts;
DROP POLICY IF EXISTS "users_manage_own_cart" ON public.user_carts;

CREATE POLICY "users_manage_own_cart"
  ON public.user_carts
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- cart_items: users can manage items in their own cart
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow users to manage their own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can manage own cart items" ON public.cart_items;
DROP POLICY IF EXISTS "users_manage_own_cart_items" ON public.cart_items;

CREATE POLICY "users_manage_own_cart_items"
  ON public.cart_items
  FOR ALL
  TO authenticated
  USING (
    cart_id IN (SELECT id FROM public.user_carts WHERE user_id = auth.uid())
  )
  WITH CHECK (
    cart_id IN (SELECT id FROM public.user_carts WHERE user_id = auth.uid())
  );
