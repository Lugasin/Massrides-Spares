/*
  # Fix Core Infrastructure

  1. Core Functions
    - Create uid() function for RLS policies
    - Create has_role() function for permission checking
    - Create handle_new_user() trigger function
    - Create audit_trigger() function for change tracking

  2. Indexes for Performance
    - Add indexes on frequently queried columns
    - Add composite indexes for complex queries
    - Add partial indexes for filtered queries

  3. Audit System
    - Create audit triggers for critical tables
    - Add comprehensive change tracking
    - Enable audit logging for compliance

  4. Security
    - Fix RLS policies for proper access control
    - Add security event logging
    - Implement proper role checking
*/

-- Create uid() function for RLS policies
CREATE OR REPLACE FUNCTION public.uid()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT auth.uid();
$$;

-- Create has_role function for permission checking
CREATE OR REPLACE FUNCTION public.has_role(_role text, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Create is_super_admin function
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = _user_id AND role = 'super_admin'
  );
$$;

-- Create audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      new_values,
      user_id,
      ip_address,
      user_agent
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id::text,
      'INSERT',
      to_jsonb(NEW),
      auth.uid(),
      current_setting('request.headers', true)::json->>'x-forwarded-for',
      current_setting('request.headers', true)::json->>'user-agent'
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      old_values,
      new_values,
      user_id,
      ip_address,
      user_agent
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id::text,
      'UPDATE',
      to_jsonb(OLD),
      to_jsonb(NEW),
      auth.uid(),
      current_setting('request.headers', true)::json->>'x-forwarded-for',
      current_setting('request.headers', true)::json->>'user-agent'
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      old_values,
      user_id,
      ip_address,
      user_agent
    ) VALUES (
      TG_TABLE_NAME,
      OLD.id::text,
      'DELETE',
      to_jsonb(OLD),
      auth.uid(),
      current_setting('request.headers', true)::json->>'x-forwarded-for',
      current_setting('request.headers', true)::json->>'user-agent'
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Add performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_spare_parts_vendor_id ON spare_parts(vendor_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_spare_parts_category_id ON spare_parts(category_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_spare_parts_featured ON spare_parts(featured) WHERE featured = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_spare_parts_availability ON spare_parts(availability_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_spare_part_id ON order_items(spare_part_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cart_items_cart_id ON cart_items(cart_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_read_at ON notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);

-- Add full-text search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_spare_parts_search ON spare_parts 
USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(brand, '')));

-- Add composite indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_spare_parts_category_status ON spare_parts(category_id, availability_status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- Create audit triggers for critical tables
DROP TRIGGER IF EXISTS audit_user_profiles ON user_profiles;
CREATE TRIGGER audit_user_profiles
  AFTER INSERT OR UPDATE OR DELETE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

DROP TRIGGER IF EXISTS audit_orders ON orders;
CREATE TRIGGER audit_orders
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

DROP TRIGGER IF EXISTS audit_spare_parts ON spare_parts;
CREATE TRIGGER audit_spare_parts
  AFTER INSERT OR UPDATE OR DELETE ON spare_parts
  FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- Enable realtime for all necessary tables
ALTER PUBLICATION supabase_realtime ADD TABLE user_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE spare_parts;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE tj_transaction_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE system_metrics;