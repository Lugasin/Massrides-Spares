-- Fix Orders RLS policies
-- Approach: Do NOT drop has_role function (it has dependents).
-- Instead, CREATE OR REPLACE to ensure it is SECURITY DEFINER.
-- Then drop and recreate only the specific policies we need.

-- Recreate has_role as SECURITY DEFINER (single-arg version)
-- Uses auth.users metadata for fastest lookup, avoids querying user_profiles
CREATE OR REPLACE FUNCTION public.has_role(_role text)
RETURNS boolean AS $$
DECLARE
  user_role text;
BEGIN
  SELECT raw_user_meta_data->>'role' INTO user_role 
  FROM auth.users 
  WHERE id = auth.uid();
  
  RETURN user_role = _role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Fix Orders RLS policies
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;

DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;

-- Re-create Orders Policies
CREATE POLICY "Users can view own orders" ON public.orders
    FOR SELECT USING (
        user_id IN (
            SELECT id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create own orders" ON public.orders
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can view all orders" ON public.orders
    FOR SELECT USING (public.has_role('admin'::text) OR public.has_role('super_admin'::text));

CREATE POLICY "Admins can update all orders" ON public.orders
    FOR UPDATE USING (public.has_role('admin'::text) OR public.has_role('super_admin'::text));

-- Re-create Order Items Policies
CREATE POLICY "Users can view own order items" ON public.order_items
    FOR SELECT USING (
        order_id IN (
            SELECT id FROM public.orders 
            WHERE user_id IN (
                SELECT id FROM public.user_profiles 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Admins can view all order items" ON public.order_items
    FOR SELECT USING (public.has_role('admin'::text) OR public.has_role('super_admin'::text));
