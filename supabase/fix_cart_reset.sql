-- Clean slate for Carts
-- This removes ALL existing carts to resolve the "Phantom Cart" issue (Exists but not visible)
-- Safe for Development Environment

TRUNCATE TABLE public.user_carts CASCADE;
TRUNCATE TABLE public.cart_items CASCADE;

-- Re-apply permissions and RLS just to be absolutely sure
GRANT ALL ON TABLE public.user_carts TO authenticated;
GRANT ALL ON TABLE public.cart_items TO authenticated;

ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_cart" ON public.user_carts;
CREATE POLICY "users_manage_own_cart"
  ON public.user_carts
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

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
