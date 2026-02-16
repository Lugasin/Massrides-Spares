-- COMPREHENSIVE FIX: Cart RLS & Permissions
-- Run this in Supabase SQL Editor.

BEGIN;

-- 1. DROP ALL EXISTING POLICIES on user_carts
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'user_carts' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_carts', pol.policyname);
    END LOOP;
END $$;

-- 2. DROP ALL EXISTING POLICIES on cart_items
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname FROM pg_policies WHERE tablename = 'cart_items' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.cart_items', pol.policyname);
    END LOOP;
END $$;

-- 3. ENABLE RLS
ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- 4. CREATE CLEAN POLICIES — user_carts
CREATE POLICY "cart_select" ON public.user_carts
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "cart_insert" ON public.user_carts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "cart_update" ON public.user_carts
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "cart_delete" ON public.user_carts
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 5. CREATE CLEAN POLICIES — cart_items
CREATE POLICY "cart_items_select" ON public.cart_items
  FOR SELECT TO authenticated
  USING (cart_id IN (SELECT id FROM public.user_carts WHERE user_id = auth.uid()));

CREATE POLICY "cart_items_insert" ON public.cart_items
  FOR INSERT TO authenticated
  WITH CHECK (cart_id IN (SELECT id FROM public.user_carts WHERE user_id = auth.uid()));

CREATE POLICY "cart_items_update" ON public.cart_items
  FOR UPDATE TO authenticated
  USING (cart_id IN (SELECT id FROM public.user_carts WHERE user_id = auth.uid()));

CREATE POLICY "cart_items_delete" ON public.cart_items
  FOR DELETE TO authenticated
  USING (cart_id IN (SELECT id FROM public.user_carts WHERE user_id = auth.uid()));

-- 6. GRANTS
GRANT ALL ON TABLE public.user_carts TO authenticated;
GRANT ALL ON TABLE public.cart_items TO authenticated;

-- 7. CLEAN UP: Remove existing carts for test user (app will recreate)
DELETE FROM public.cart_items 
WHERE cart_id IN (
  SELECT id FROM public.user_carts 
  WHERE user_id = '970e4f04-a9eb-4d08-a600-7c51d636cd3a'
);

DELETE FROM public.user_carts 
WHERE user_id = '970e4f04-a9eb-4d08-a600-7c51d636cd3a';

COMMIT;
