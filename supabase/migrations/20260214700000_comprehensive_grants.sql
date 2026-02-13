-- Migration: Comprehensive table grants for authenticated and anon roles
-- Uses safe pattern: checks table existence before granting to avoid errors.

GRANT USAGE ON SCHEMA public TO anon, authenticated;

DO $$
DECLARE
  t text;
BEGIN
  -- Public read tables (anon + authenticated)
  FOREACH t IN ARRAY ARRAY[
    'spare_parts', 'categories', 'ads'
  ] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated', t);
    END IF;
  END LOOP;

  -- Authenticated full CRUD tables
  FOREACH t IN ARRAY ARRAY[
    'orders', 'order_items', 'cart_items', 'user_carts', 'user_profiles',
    'notifications', 'wishlists', 'activity_logs',
    'conversations', 'messages', 'quote_requests', 'quote_items',
    'tj_payment_methods', 'spare_parts',
    'vendors', 'vendor_users', 'vendor_orders', 'inventory_logs',
    'ads', 'ad_placements', 'ad_click_analytics'
  ] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('GRANT ALL ON public.%I TO authenticated', t);
    END IF;
  END LOOP;

  -- Guest tables (anon + authenticated)
  FOREACH t IN ARRAY ARRAY[
    'guest_cart_items', 'guest_carts'
  ] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated', t);
    END IF;
  END LOOP;

  -- Read-only for authenticated
  FOREACH t IN ARRAY ARRAY[
    'email_logs'
  ] LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t) THEN
      EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
    END IF;
  END LOOP;
END $$;
