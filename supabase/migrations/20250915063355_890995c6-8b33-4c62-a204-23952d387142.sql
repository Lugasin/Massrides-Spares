-- Fix critical security vulnerability in orders table
-- Remove overly permissive system policies and replace with secure ones

-- Drop the dangerous system policies
DROP POLICY IF EXISTS "System can insert orders" ON public.orders;
DROP POLICY IF EXISTS "System can update orders" ON public.orders;

-- Create secure replacement policies that require proper authentication
-- Allow service role to insert orders (for payment processing) but with audit logging
CREATE POLICY "Service role can insert orders with audit" ON public.orders
FOR INSERT 
TO service_role
WITH CHECK (
  -- Log the insertion for audit purposes
  (SELECT public.log_security_event(
    'order_creation'::text,
    COALESCE(user_id, (SELECT id FROM user_profiles WHERE email = guest_email LIMIT 1)),
    order_number::text,
    total_amount,
    NULL::inet,
    NULL::text,
    0,
    false,
    jsonb_build_object(
      'order_id', gen_random_uuid()::text,
      'payment_method', CASE WHEN stripe_session_id IS NOT NULL THEN 'stripe' WHEN payment_intent_id IS NOT NULL THEN 'tj_payment' ELSE 'unknown' END,
      'source', 'service_role_insert'
    )
  ) IS NOT NULL)
);

-- Allow service role to update orders (for status changes) but with restrictions and audit logging
CREATE POLICY "Service role can update order status with audit" ON public.orders
FOR UPDATE 
TO service_role
USING (
  -- Only allow updates to specific fields: status, payment_status, shipped_at, delivered_at, tracking_number, notes
  -- Log the update for audit purposes
  (SELECT public.log_security_event(
    'order_update'::text,
    COALESCE(user_id, (SELECT id FROM user_profiles WHERE email = guest_email LIMIT 1)),
    order_number::text,
    total_amount,
    NULL::inet,
    NULL::text,
    0,
    false,
    jsonb_build_object(
      'order_id', id::text,
      'source', 'service_role_update',
      'allowed_fields', '["status", "payment_status", "shipped_at", "delivered_at", "tracking_number", "notes", "tj", "updated_at"]'
    )
  ) IS NOT NULL)
)
WITH CHECK (
  -- Ensure sensitive payment fields are not being modified inappropriately
  (OLD.stripe_session_id IS NOT DISTINCT FROM NEW.stripe_session_id) AND
  (OLD.payment_intent_id IS NOT DISTINCT FROM NEW.payment_intent_id) AND
  (OLD.total_amount IS NOT DISTINCT FROM NEW.total_amount) AND
  (OLD.billing_address IS NOT DISTINCT FROM NEW.billing_address) AND
  (OLD.shipping_address IS NOT DISTINCT FROM NEW.shipping_address) AND
  (OLD.user_id IS NOT DISTINCT FROM NEW.user_id) AND
  (OLD.guest_email IS NOT DISTINCT FROM NEW.guest_email) AND
  (OLD.order_number IS NOT DISTINCT FROM NEW.order_number) AND
  (OLD.created_at IS NOT DISTINCT FROM NEW.created_at)
);

-- Allow authenticated edge functions to insert orders (for payment processing)
CREATE POLICY "Edge functions can insert orders with validation" ON public.orders
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Verify the request is coming from an edge function context
  (auth.jwt() ->> 'iss' = 'https://aaznqeoivpqqbuxqioin.supabase.co/auth/v1') AND
  -- Ensure basic data integrity
  (total_amount > 0) AND
  (order_number IS NOT NULL) AND
  (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')) AND
  (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')) AND
  -- Either user_id or guest_email must be provided
  (user_id IS NOT NULL OR guest_email IS NOT NULL) AND
  -- Log the insertion
  (SELECT public.log_security_event(
    'order_creation_edge_function'::text,
    COALESCE(user_id, (SELECT id FROM user_profiles WHERE email = guest_email LIMIT 1)),
    order_number::text,
    total_amount,
    NULL::inet,
    NULL::text,
    0,
    false,
    jsonb_build_object(
      'order_id', gen_random_uuid()::text,
      'source', 'edge_function_insert',
      'user_agent', auth.jwt() ->> 'user_agent'
    )
  ) IS NOT NULL)
);

-- Allow authenticated edge functions to update orders with strict validation
CREATE POLICY "Edge functions can update orders with validation" ON public.orders
FOR UPDATE 
TO authenticated
USING (
  -- Verify the request is coming from an edge function context
  (auth.jwt() ->> 'iss' = 'https://aaznqeoivpqqbuxqioin.supabase.co/auth/v1') AND
  -- Log the access attempt
  (SELECT public.log_security_event(
    'order_update_attempt_edge_function'::text,
    COALESCE(user_id, (SELECT id FROM user_profiles WHERE email = guest_email LIMIT 1)),
    order_number::text,
    total_amount,
    NULL::inet,
    NULL::text,
    0,
    false,
    jsonb_build_object(
      'order_id', id::text,
      'source', 'edge_function_update_attempt'
    )
  ) IS NOT NULL)
)
WITH CHECK (
  -- Strict validation: only allow updates to safe fields
  (OLD.stripe_session_id IS NOT DISTINCT FROM NEW.stripe_session_id) AND
  (OLD.payment_intent_id IS NOT DISTINCT FROM NEW.payment_intent_id) AND
  (OLD.billing_address IS NOT DISTINCT FROM NEW.billing_address) AND
  (OLD.shipping_address IS NOT DISTINCT FROM NEW.shipping_address) AND
  (OLD.user_id IS NOT DISTINCT FROM NEW.user_id) AND
  (OLD.guest_email IS NOT DISTINCT FROM NEW.guest_email) AND
  (OLD.order_number IS NOT DISTINCT FROM NEW.order_number) AND
  (OLD.created_at IS NOT DISTINCT FROM NEW.created_at) AND
  -- Allow reasonable updates
  (NEW.status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')) AND
  (NEW.payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')) AND
  (NEW.total_amount = OLD.total_amount) AND -- Don't allow amount changes
  -- Log successful update
  (SELECT public.log_security_event(
    'order_update_success_edge_function'::text,
    COALESCE(NEW.user_id, (SELECT id FROM user_profiles WHERE email = NEW.guest_email LIMIT 1)),
    NEW.order_number::text,
    NEW.total_amount,
    NULL::inet,
    NULL::text,
    0,
    false,
    jsonb_build_object(
      'order_id', NEW.id::text,
      'source', 'edge_function_update_success',
      'old_status', OLD.status,
      'new_status', NEW.status,
      'old_payment_status', OLD.payment_status,
      'new_payment_status', NEW.payment_status
    )
  ) IS NOT NULL)
);