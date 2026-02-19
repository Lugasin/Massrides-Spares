-- DEBUG OPTION: Temporarily open RLS to confirm if auth.uid() is the issue.
-- WARNING: This allows ANY authenticated user to see/edit ANY cart.
-- ONLY run this for debugging in development.

ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- user_carts
DROP POLICY IF EXISTS "users_manage_own_cart" ON public.user_carts;
CREATE POLICY "users_manage_own_cart"
  ON public.user_carts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- cart_items
DROP POLICY IF EXISTS "users_manage_own_cart_items" ON public.cart_items;
CREATE POLICY "users_manage_own_cart_items"
  ON public.cart_items
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
