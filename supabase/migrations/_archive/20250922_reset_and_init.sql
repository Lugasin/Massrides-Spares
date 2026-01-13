-- WARNING: Destructive reset migration
-- This migration will DROP the public schema and recreate it with the app schema.
-- All data in the public schema will be lost. You confirmed this action.

BEGIN;

-- Drop and recreate public schema
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. roles table
CREATE TABLE IF NOT EXISTS roles (
  id bigserial primary key,
  name text not null unique,
  description text
);

-- 1. profiles
CREATE TABLE IF NOT EXISTS profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  bio text,
  metadata jsonb default '{}'::jsonb,
  email_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. guest_sessions
CREATE TABLE IF NOT EXISTS guest_sessions (
  token text primary key,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. vendors
CREATE TABLE IF NOT EXISTS vendors (
  id bigserial primary key,
  owner_id uuid references profiles(id) on delete set null,
  corporate_name text,
  slug text unique,
  description text,
  contact_email text,
  contact_phone text,
  address jsonb,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 4. categories
CREATE TABLE IF NOT EXISTS categories (
  id bigserial primary key,
  name text not null,
  slug text unique,
  parent_id bigint references categories(id),
  description text,
  is_active boolean default true,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- 5. products
CREATE TABLE IF NOT EXISTS products (
  id bigserial primary key,
  vendor_id bigint references vendors(id) on delete cascade,
  sku text,
  title text not null,
  description text,
  price numeric(12,2) not null,
  currency text default 'ZMW',
  active boolean default true,
  main_image text,
  media jsonb default '[]'::jsonb,
  category_id bigint references categories(id),
  attributes jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS products_price_idx ON products(price);
CREATE INDEX IF NOT EXISTS products_vendor_idx ON products(vendor_id);

-- 6. inventory
CREATE TABLE IF NOT EXISTS inventory (
  id bigserial primary key,
  product_id bigint references products(id) on delete cascade,
  vendor_id bigint references vendors(id),
  quantity integer not null default 0,
  reserved integer not null default 0,
  threshold integer not null default 5,
  location text,
  last_restocked timestamptz
);

CREATE INDEX IF NOT EXISTS inventory_product_idx ON inventory(product_id);

-- 7. carts
CREATE TABLE IF NOT EXISTS carts (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  guest_token text references guest_sessions(token),
  items jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

-- 8. orders & order_items
CREATE TABLE IF NOT EXISTS orders (
  id bigserial primary key,
  order_reference text unique default gen_random_uuid()::text,
  user_id uuid references profiles(id),
  guest_token text references guest_sessions(token),
  vendor_id bigint references vendors(id),
  customer_email text,
  email_verified boolean default false,
  delivery_address jsonb,
  subtotal numeric(12,2),
  shipping numeric(12,2) default 0,
  taxes numeric(12,2) default 0,
  total numeric(12,2),
  currency text default 'ZMW',
  status text not null default 'pending',
  payment_provider text,
  payment_provider_ref text,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id bigserial primary key,
  order_id bigint references orders(id) on delete cascade,
  product_id bigint references products(id),
  title text,
  price numeric(12,2),
  quantity integer,
  subtotal numeric(12,2)
);

-- 9. payments
CREATE TABLE IF NOT EXISTS payments (
  id bigserial primary key,
  order_id bigint references orders(id) on delete cascade,
  vendor_id bigint references vendors(id),
  provider text,
  provider_session_id text,
  provider_payment_id text,
  amount numeric(12,2),
  currency text default 'ZMW',
  status text default 'initiated',
  raw_payload jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS payments_order_idx ON payments(order_id);

-- 10. payment_methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id bigserial primary key,
  user_id uuid references profiles(id),
  provider text,
  provider_customer_id text,
  provider_payment_method_ref text,
  label text,
  is_default boolean default false,
  created_at timestamptz default now()
);

-- 11. payouts & vendor_balance
CREATE TABLE IF NOT EXISTS payouts (
  id bigserial primary key,
  vendor_id bigint references vendors(id),
  amount numeric(12,2),
  status text default 'requested',
  payout_ref text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS vendor_balances (
  vendor_id bigint primary key references vendors(id),
  balance numeric(12,2) default 0,
  pending numeric(12,2) default 0,
  updated_at timestamptz default now()
);

-- 12. webhooks_log
CREATE TABLE IF NOT EXISTS webhooks_log (
  id bigserial primary key,
  provider text,
  event_type text,
  payload jsonb,
  received_at timestamptz default now(),
  handled boolean default false,
  handling_notes text
);

-- 13. notifications
CREATE TABLE IF NOT EXISTS notifications (
  id bigserial primary key,
  user_id uuid references profiles(id),
  type text,
  title text,
  message text,
  data jsonb,
  read boolean default false,
  created_at timestamptz default now()
);

-- 14. audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id bigserial primary key,
  actor_id uuid,
  actor_role text,
  action text,
  object_type text,
  object_id text,
  diff jsonb,
  created_at timestamptz default now()
);

-- 15. delivery_addresses
CREATE TABLE IF NOT EXISTS delivery_addresses (
  id bigserial primary key,
  user_id uuid references profiles(id),
  label text,
  address jsonb,
  phone text,
  created_at timestamptz default now()
);

-- 16. materialized view: daily revenue
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_daily_revenue') THEN
    CREATE MATERIALIZED VIEW mv_daily_revenue AS
    SELECT
      date_trunc('day', o.created_at) as day,
      coalesce(sum(p.amount),0) as revenue,
      count(distinct o.id) as orders_count
    FROM orders o
    JOIN payments p on p.order_id = o.id
    WHERE p.status = 'succeeded'
    GROUP BY date_trunc('day', o.created_at)
    ORDER BY day desc;
  END IF;
END$$;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor ON orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Triggers & Helper SQL
CREATE OR REPLACE FUNCTION log_table_changes() RETURNS trigger AS $$
DECLARE
  actor uuid;
BEGIN
  BEGIN
    actor := current_setting('jwt.claims.user_id', true)::uuid;
  EXCEPTION WHEN OTHERS THEN
    actor := null;
  END;

  IF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_logs(actor_id, actor_role, action, object_type, object_id, diff)
    VALUES (
      actor,
      current_setting('jwt.claims.role', true),
      'CREATE',
      TG_TABLE_NAME,
      COALESCE(NEW.id::text, ''),
      row_to_json(NEW)
    );
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_logs(actor_id, actor_role, action, object_type, object_id, diff)
    VALUES (
      actor,
      current_setting('jwt.claims.role', true),
      'UPDATE',
      TG_TABLE_NAME,
      COALESCE(NEW.id::text, ''),
      json_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW))
    );
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_logs(actor_id, actor_role, action, object_type, object_id, diff)
    VALUES (
      actor,
      current_setting('jwt.claims.role', true),
      'DELETE',
      TG_TABLE_NAME,
      COALESCE(OLD.id::text, ''),
      row_to_json(OLD)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_orders AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE PROCEDURE log_table_changes();
CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE PROCEDURE log_table_changes();
CREATE TRIGGER audit_products AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE PROCEDURE log_table_changes();

-- Reserve inventory
CREATE OR REPLACE FUNCTION reserve_inventory_for_order(o_id bigint) RETURNS void AS $$
DECLARE
  rec record;
  req_qty int;
  inv record;
  v_id bigint;
BEGIN
  SELECT vendor_id INTO v_id FROM orders WHERE id = o_id;
  FOR rec IN SELECT * FROM order_items WHERE order_id = o_id LOOP
    req_qty := rec.quantity;
    SELECT * INTO inv FROM inventory WHERE product_id = rec.product_id AND vendor_id = v_id LIMIT 1;
    IF inv IS NULL THEN
      RAISE EXCEPTION 'No inventory record for product %', rec.product_id;
    END IF;
    IF (inv.quantity - inv.reserved) < req_qty THEN
      RAISE EXCEPTION 'Insufficient stock for product %', rec.product_id;
    END IF;
    UPDATE inventory SET reserved = reserved + req_qty WHERE id = inv.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Release inventory
CREATE OR REPLACE FUNCTION release_inventory_for_order(o_id bigint) RETURNS void AS $$
DECLARE
  rec record;
  inv record;
  v_id bigint;
BEGIN
  SELECT vendor_id INTO v_id FROM orders WHERE id = o_id;
  FOR rec IN SELECT * FROM order_items WHERE order_id = o_id LOOP
    SELECT * INTO inv FROM inventory WHERE product_id = rec.product_id AND vendor_id = v_id LIMIT 1;
    IF inv IS NOT NULL THEN
      UPDATE inventory SET reserved = greatest(0, reserved - rec.quantity) WHERE id = inv.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Commit inventory
CREATE OR REPLACE FUNCTION commit_inventory_for_product(p_product_id bigint, p_vendor_id bigint, p_qty integer) RETURNS void AS $$
DECLARE
  inv record;
BEGIN
  SELECT * INTO inv FROM inventory WHERE product_id = p_product_id AND vendor_id = p_vendor_id LIMIT 1;
  IF inv IS NULL THEN
    RAISE EXCEPTION 'No inventory record for product %', p_product_id;
  END IF;
  UPDATE inventory SET
    reserved = greatest(0, reserved - p_qty),
    quantity = greatest(0, quantity - p_qty)
  WHERE id = inv.id;
END;
$$ LANGUAGE plpgsql;

COMMIT;
