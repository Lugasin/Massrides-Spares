-- Fix guest cart security by implementing session-based RLS policies

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Guests can manage guest carts" ON public.guest_carts;
DROP POLICY IF EXISTS "Guests can manage guest cart items" ON public.guest_cart_items;

-- Create secure policies for guest_carts that restrict access to session owner
CREATE POLICY "Guest carts session access"
  ON public.guest_carts
  FOR ALL
  USING (
    -- Allow access if session_id matches the current session
    session_id = current_setting('request.headers', true)::json->>'x-session-id'
    OR 
    -- Allow access if user is admin/super_admin (for management purposes)
    (auth.uid() IS NOT NULL AND (
      has_role(auth.uid(), 'admin'::app_role) OR 
      has_role(auth.uid(), 'super_admin'::app_role)
    ))
  )
  WITH CHECK (
    -- Same check for inserts/updates
    session_id = current_setting('request.headers', true)::json->>'x-session-id'
    OR 
    (auth.uid() IS NOT NULL AND (
      has_role(auth.uid(), 'admin'::app_role) OR 
      has_role(auth.uid(), 'super_admin'::app_role)
    ))
  );

-- Create secure policies for guest_cart_items that check the cart ownership
CREATE POLICY "Guest cart items session access"
  ON public.guest_cart_items
  FOR ALL
  USING (
    -- Allow access if the cart belongs to the current session
    EXISTS (
      SELECT 1 FROM public.guest_carts gc 
      WHERE gc.id = guest_cart_items.guest_cart_id 
      AND (
        gc.session_id = current_setting('request.headers', true)::json->>'x-session-id'
        OR 
        -- Allow access if user is admin/super_admin
        (auth.uid() IS NOT NULL AND (
          has_role(auth.uid(), 'admin'::app_role) OR 
          has_role(auth.uid(), 'super_admin'::app_role)
        ))
      )
    )
  )
  WITH CHECK (
    -- Same check for inserts/updates
    EXISTS (
      SELECT 1 FROM public.guest_carts gc 
      WHERE gc.id = guest_cart_items.guest_cart_id 
      AND (
        gc.session_id = current_setting('request.headers', true)::json->>'x-session-id'
        OR 
        (auth.uid() IS NOT NULL AND (
          has_role(auth.uid(), 'admin'::app_role) OR 
          has_role(auth.uid(), 'super_admin'::app_role)
        ))
      )
    )
  );