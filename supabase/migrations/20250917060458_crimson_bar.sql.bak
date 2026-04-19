/*
  # Rollback Procedures for All Migrations

  This file contains rollback procedures for each migration.
  Execute these in REVERSE order if you need to rollback changes.

  WARNING: These operations will delete data. Ensure you have backups!
*/

-- =====================================================
-- ROLLBACK 008: Admin Roles System
-- =====================================================

/*
-- Rollback admin roles migration
DROP TRIGGER IF EXISTS log_admin_role_changes ON public.admin_roles;
DROP FUNCTION IF EXISTS public.log_admin_role_change();
DROP FUNCTION IF EXISTS public.cleanup_expired_admin_roles();
DROP FUNCTION IF EXISTS public.revoke_admin_role(uuid, text);
DROP FUNCTION IF EXISTS public.grant_admin_role(uuid, text, timestamptz);
DROP FUNCTION IF EXISTS public.has_admin_permission(text, uuid);
DROP TABLE IF EXISTS public.admin_roles CASCADE;
*/

-- =====================================================
-- ROLLBACK 007: Realtime Features
-- =====================================================

/*
-- Rollback realtime configuration
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_profiles;
ALTER PUBLICATION supabase_realtime DROP TABLE public.spare_parts;
ALTER PUBLICATION supabase_realtime DROP TABLE public.orders;
ALTER PUBLICATION supabase_realtime DROP TABLE public.order_items;
ALTER PUBLICATION supabase_realtime DROP TABLE public.cart_items;
ALTER PUBLICATION supabase_realtime DROP TABLE public.guest_cart_items;
ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
ALTER PUBLICATION supabase_realtime DROP TABLE public.messages;
ALTER PUBLICATION supabase_realtime DROP TABLE public.conversations;
ALTER PUBLICATION supabase_realtime DROP TABLE public.quotes;
ALTER PUBLICATION supabase_realtime DROP TABLE public.quote_items;
ALTER PUBLICATION supabase_realtime DROP TABLE public.activity_logs;
ALTER PUBLICATION supabase_realtime DROP TABLE public.tj_transaction_logs;
ALTER PUBLICATION supabase_realtime DROP TABLE public.tj_security_logs;
ALTER PUBLICATION supabase_realtime DROP TABLE public.system_metrics;

DROP FUNCTION IF EXISTS public.get_unread_notification_count(uuid);
DROP FUNCTION IF EXISTS public.get_cart_item_count(uuid);
*/

-- =====================================================
-- ROLLBACK 006: Product Data Migration
-- =====================================================

/*
-- Rollback product data migration
DELETE FROM public.spare_parts WHERE vendor_id IN (
    SELECT id FROM public.user_profiles WHERE email = 'vendor@massrides.co.zm'
);
DELETE FROM public.company_partners;
DELETE FROM public.user_profiles WHERE email = 'vendor@massrides.co.zm';
*/

-- =====================================================
-- ROLLBACK 005: Audit System
-- =====================================================

/*
-- Rollback audit system migration
DROP TRIGGER IF EXISTS audit_user_profiles ON public.user_profiles;
DROP TRIGGER IF EXISTS audit_spare_parts ON public.spare_parts;
DROP TRIGGER IF EXISTS audit_orders ON public.orders;
DROP TRIGGER IF EXISTS update_ads_updated_at ON public.ads;
DROP TRIGGER IF EXISTS update_company_partners_updated_at ON public.company_partners;

DROP FUNCTION IF EXISTS public.audit_trigger();
DROP FUNCTION IF EXISTS public.record_metric(text, numeric, text, jsonb);
DROP FUNCTION IF EXISTS public.log_security_event(text, uuid, text, integer, boolean, numeric, inet, text, jsonb);

DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.system_metrics CASCADE;
DROP TABLE IF EXISTS public.ads CASCADE;
DROP TABLE IF EXISTS public.company_partners CASCADE;
*/

-- =====================================================
-- ROLLBACK 004: Payment System
-- =====================================================

/*
-- Rollback payment system migration
DROP TRIGGER IF EXISTS ensure_single_default_payment_method ON public.tj_payment_methods;
DROP TRIGGER IF EXISTS update_tj_payment_methods_updated_at ON public.tj_payment_methods;
DROP TRIGGER IF EXISTS update_user_settings_updated_at ON public.user_settings;

DROP FUNCTION IF EXISTS public.ensure_single_default_payment_method();

DROP TABLE IF EXISTS public.tj_transaction_logs CASCADE;
DROP TABLE IF EXISTS public.tj_payment_methods CASCADE;
DROP TABLE IF EXISTS public.tj_security_logs CASCADE;
DROP TABLE IF EXISTS public.user_settings CASCADE;
*/

-- =====================================================
-- ROLLBACK 003: Communication System
-- =====================================================

/*
-- Rollback communication system migration
DROP TRIGGER IF EXISTS update_conversation_on_message ON public.messages;
DROP FUNCTION IF EXISTS public.update_conversation_last_message();
DROP FUNCTION IF EXISTS public.cleanup_expired_guest_verifications();

DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.guest_verifications CASCADE;
*/

-- =====================================================
-- ROLLBACK 002: Order System
-- =====================================================

/*
-- Rollback order system migration
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
DROP TRIGGER IF EXISTS update_quotes_updated_at ON public.quotes;
DROP TRIGGER IF EXISTS update_quote_items_updated_at ON public.quote_items;

DROP FUNCTION IF EXISTS public.generate_order_number();
DROP FUNCTION IF EXISTS public.generate_quote_number();

DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.quote_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.quotes CASCADE;
*/

-- =====================================================
-- ROLLBACK 001: Core Tables
-- =====================================================

/*
-- Rollback core tables migration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
DROP TRIGGER IF EXISTS update_spare_parts_updated_at ON public.spare_parts;
DROP TRIGGER IF EXISTS update_user_carts_updated_at ON public.user_carts;
DROP TRIGGER IF EXISTS update_guest_carts_updated_at ON public.guest_carts;

DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.is_super_admin(uuid);
DROP FUNCTION IF EXISTS public.has_role(text, uuid);
DROP FUNCTION IF EXISTS public.uid();

DROP TABLE IF EXISTS public.cart_items CASCADE;
DROP TABLE IF EXISTS public.guest_cart_items CASCADE;
DROP TABLE IF EXISTS public.user_carts CASCADE;
DROP TABLE IF EXISTS public.guest_carts CASCADE;
DROP TABLE IF EXISTS public.spare_parts CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
*/

-- =====================================================
-- COMPLETE DATABASE RESET (EMERGENCY ONLY)
-- =====================================================

/*
-- WARNING: This will delete ALL data and schema
-- Only use in development or emergency situations

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
*/