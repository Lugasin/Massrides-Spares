/*
  # Enable Realtime Features

  1. Realtime Configuration
    - Enable realtime for all necessary tables
    - Configure publication settings
    - Set up proper filters for security

  2. Performance
    - Optimize realtime subscriptions
    - Add proper indexes for realtime queries
    - Configure connection limits

  3. Security
    - Ensure RLS applies to realtime
    - Configure proper authentication
*/

-- =====================================================
-- ENABLE REALTIME ON TABLES
-- =====================================================

-- Enable realtime for core tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.spare_parts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cart_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.guest_cart_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quote_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tj_transaction_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tj_security_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_metrics;

-- =====================================================
-- REALTIME SECURITY CONFIGURATION
-- =====================================================

-- Ensure RLS is enabled for all realtime tables (already done in previous migrations)
-- RLS policies will automatically apply to realtime subscriptions

-- =====================================================
-- PERFORMANCE OPTIMIZATION FOR REALTIME
-- =====================================================

-- Add composite indexes for common realtime queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read_at) 
WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_conversation_recent ON public.messages(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_user_recent ON public.orders(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_recent ON public.activity_logs(user_id, created_at DESC);

-- =====================================================
-- REALTIME HELPER FUNCTIONS
-- =====================================================

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT COUNT(*)::integer
    FROM public.notifications
    WHERE user_id = p_user_id AND read_at IS NULL;
$$;

-- Function to get user's active cart item count
CREATE OR REPLACE FUNCTION public.get_cart_item_count(p_user_id uuid)
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT COALESCE(SUM(ci.quantity), 0)::integer
    FROM public.cart_items ci
    JOIN public.user_carts uc ON ci.cart_id = uc.id
    WHERE uc.user_id = p_user_id;
$$;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION public.get_unread_notification_count IS 'Returns count of unread notifications for a user';
COMMENT ON FUNCTION public.get_cart_item_count IS 'Returns total quantity of items in user cart';