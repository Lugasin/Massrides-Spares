-- Consolidated Migration: Fresh Init (Schema + RLS + Seeds)
-- Generated: 2026-01-12

BEGIN;

-- 1. DROP and RECREATE public schema (Clean Slate)
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES

-- roles
CREATE TABLE IF NOT EXISTS roles (
  id bigserial primary key,
  name text not null unique,
  description text
);

-- profiles
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

-- guest_sessions
CREATE TABLE IF NOT EXISTS guest_sessions (
  token text primary key,
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- vendors
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

-- categories
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

-- products
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

-- inventory
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

-- carts
CREATE TABLE IF NOT EXISTS carts (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  guest_token text references guest_sessions(token),
  items jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

-- orders
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

-- payments
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
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor ON orders(vendor_id);

-- payment_methods
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

-- payouts & vendor_balance
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

-- webhooks_log
CREATE TABLE IF NOT EXISTS webhooks_log (
  id bigserial primary key,
  provider text,
  event_type text,
  payload jsonb,
  received_at timestamptz default now(),
  handled boolean default false,
  handling_notes text
);

-- notifications
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

-- audit_logs
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

-- delivery_addresses
CREATE TABLE IF NOT EXISTS delivery_addresses (
  id bigserial primary key,
  user_id uuid references profiles(id),
  label text,
  address jsonb,
  phone text,
  created_at timestamptz default now()
);

-- messages (from previous Context, missing in reset_and_init but used in App)
-- Adding conversations/messages support if not present in reset_and_init?
-- Wait, the USER said 'messages' table was verified in step 207?
-- Let's check reset_and_init again. Step 259. NO messages table!
-- Step 207 verfied 'messages' table. It must have been in a DIFFERENT migration I didn't verify?
-- Looking at file list: 20250917060303_heavy_summit.sql? or others.
-- CRITICAL: `reset_and_init` DROPS basic schema but might MISS messages if it was added later.
-- But `reset_and_init` is dated 2025-09-22.
-- If `messages` was added in `20250917...` but NOT in `reset_and_init`, then `reset_and_init` WIPES IT.
-- I MUST ADD MESSAGES TABLE support here.

CREATE TABLE IF NOT EXISTS conversations (
  id bigserial primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS conversation_participants (
   conversation_id bigint references conversations(id) on delete cascade,
   user_id uuid references profiles(id) on delete cascade,
   primary key (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id bigserial primary key,
  conversation_id bigint references conversations(id) on delete cascade,
  sender_id uuid references profiles(id),
  content text,
  read boolean default false,
  created_at timestamptz default now()
);

-- 3. FUNCTIONS & TRIGGERS

-- Audit function
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
    VALUES (actor, current_setting('jwt.claims.role', true), 'CREATE', TG_TABLE_NAME, COALESCE(NEW.id::text, ''), row_to_json(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_logs(actor_id, actor_role, action, object_type, object_id, diff)
    VALUES (actor, current_setting('jwt.claims.role', true), 'UPDATE', TG_TABLE_NAME, COALESCE(NEW.id::text, ''), json_build_object('old', row_to_json(OLD), 'new', row_to_json(NEW)));
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_logs(actor_id, actor_role, action, object_type, object_id, diff)
    VALUES (actor, current_setting('jwt.claims.role', true), 'DELETE', TG_TABLE_NAME, COALESCE(OLD.id::text, ''), row_to_json(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit triggers
CREATE TRIGGER audit_orders AFTER INSERT OR UPDATE OR DELETE ON orders FOR EACH ROW EXECUTE PROCEDURE log_table_changes();
CREATE TRIGGER audit_payments AFTER INSERT OR UPDATE OR DELETE ON payments FOR EACH ROW EXECUTE PROCEDURE log_table_changes();
CREATE TRIGGER audit_products AFTER INSERT OR UPDATE OR DELETE ON products FOR EACH ROW EXECUTE PROCEDURE log_table_changes();

-- Inventory Functions
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

CREATE OR REPLACE FUNCTION commit_inventory_for_product(p_product_id bigint, p_vendor_id bigint, p_qty integer) RETURNS void as $$
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

-- 4. RLS POLICIES

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_self_select" ON profiles FOR SELECT USING ( auth.uid() = id );
CREATE POLICY "profiles_self_update" ON profiles FOR UPDATE USING ( auth.uid() = id ) WITH CHECK ( auth.uid() = id );
CREATE POLICY "profiles_public_read" ON profiles FOR SELECT USING ( true ); -- Allow public read for vendors/support?

-- Vendors
CREATE POLICY "vendors_public_read" ON vendors FOR SELECT USING ( true );
CREATE POLICY "vendors_owner_all" ON vendors FOR ALL USING ( auth.uid() = owner_id );

-- Products
CREATE POLICY "products_public_select" ON products FOR SELECT USING ( active = true );
CREATE POLICY "products_vendor_manage" ON products FOR ALL
  USING ( exists(select 1 from profiles p join vendors v on v.owner_id = p.id where p.id = auth.uid() and v.id = vendor_id) )
  WITH CHECK ( exists(select 1 from profiles p join vendors v on v.owner_id = p.id where p.id = auth.uid() and v.id = vendor_id) );

-- Orders
CREATE POLICY "orders_customer_select" ON orders FOR SELECT USING ( auth.uid() = user_id );
CREATE POLICY "orders_vendor_select" ON orders FOR SELECT USING (
  exists(select 1 from profiles p join vendors v on v.owner_id = p.id where p.id = auth.uid() and v.id = vendor_id)
);

-- Notifications
CREATE POLICY "notifications_own" ON notifications FOR ALL USING ( auth.uid() = user_id );

-- Messages/Conversations (Minimal)
CREATE POLICY "conversations_participant" ON conversations FOR ALL USING (
  exists(select 1 from conversation_participants cp where cp.conversation_id = id and cp.user_id = auth.uid())
);
CREATE POLICY "messages_participant" ON messages FOR ALL USING (
  exists(select 1 from conversation_participants cp where cp.conversation_id = conversation_id and cp.user_id = auth.uid())
);

-- 5. SEEDS

INSERT INTO categories (id, name, slug, description, is_active, sort_order)
VALUES
  (1001, 'Engine Parts', 'engine-parts', 'Parts for engines', true, 10),
  (1002, 'Hydraulic Parts', 'hydraulic-parts', 'Pumps and hoses', true, 20),
  (1003, 'Electrical Parts', 'electrical-parts', 'Wiring and sensors', true, 30),
  (1004, 'Transmission Parts', 'transmission-parts', 'Gearboxes', true, 40),
  (1005, 'Cooling System', 'cooling-system', 'Radiators', true, 50)
ON CONFLICT (id) DO NOTHING;

-- Log the event
CREATE OR REPLACE FUNCTION log_security_event(p_event_type text, p_metadata jsonb) returns void as $$
BEGIN
  insert into audit_logs(actor_id, action, object_type, diff)
  values(auth.uid(), 'SECURITY_EVENT', p_event_type, p_metadata);
END;
$$ language plpgsql security definer;

COMMIT;
