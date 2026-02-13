-- ============================
-- Agri Spare: Migrations (updated for guest->email flow)
-- Paste into Supabase SQL editor
-- ============================

-- Extensions
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- 0. roles table (optional seeds later)
create table if not exists roles (
  id bigserial primary key,
  name text not null unique,
  description text
);

-- 1. profiles
create table if not exists profiles (
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

-- 2. guest_sessions (keeps guest carts/order references)
create table if not exists guest_sessions (
  token text primary key,           -- generated client-side (ULID/UUID)
  email text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. vendors
create table if not exists vendors (
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
create table if not exists categories (
  id bigserial primary key,
  name text not null,
  slug text unique,
  parent_id bigint references categories(id),
  created_at timestamptz default now()
);

-- 5. products
create table if not exists products (
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

create index if not exists products_price_idx on products(price);
create index if not exists products_vendor_idx on products(vendor_id);

-- 6. inventory
create table if not exists inventory (
  id bigserial primary key,
  product_id bigint references products(id) on delete cascade,
  vendor_id bigint references vendors(id),
  quantity integer not null default 0,      -- available stock
  reserved integer not null default 0,      -- reserved for pending/initiated orders
  threshold integer not null default 5,
  location text,
  last_restocked timestamptz
);

create index if not exists inventory_product_idx on inventory(product_id);

-- 7. carts (server-side optional)
create table if not exists carts (
  id bigserial primary key,
  user_id uuid references profiles(id) on delete cascade,
  guest_token text references guest_sessions(token),
  items jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

-- 8. orders & order_items
create table if not exists orders (
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
  status text not null default 'pending',    -- pending, initiated, paid, failed, refunded, cancelled, shipped, delivered
  payment_provider text,
  payment_provider_ref text,
  expires_at timestamptz,                    -- cancel if not paid by this time
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists order_items (
  id bigserial primary key,
  order_id bigint references orders(id) on delete cascade,
  product_id bigint references products(id),
  title text,
  price numeric(12,2),
  quantity integer,
  subtotal numeric(12,2)
);

-- 9. payments
create table if not exists payments (
  id bigserial primary key,
  order_id bigint references orders(id) on delete cascade,
  vendor_id bigint references vendors(id),
  provider text,
  provider_session_id text,
  provider_payment_id text,
  amount numeric(12,2),
  currency text default 'ZMW',
  status text default 'initiated',   -- initiated, succeeded, failed, refunded, chargeback
  raw_payload jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists payments_order_idx on payments(order_id);

-- 10. payment_methods
create table if not exists payment_methods (
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
create table if not exists payouts (
  id bigserial primary key,
  vendor_id bigint references vendors(id),
  amount numeric(12,2),
  status text default 'requested',
  payout_ref text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists vendor_balances (
  vendor_id bigint primary key references vendors(id),
  balance numeric(12,2) default 0,
  pending numeric(12,2) default 0,
  updated_at timestamptz default now()
);

-- 12. webhooks_log
create table if not exists webhooks_log (
  id bigserial primary key,
  provider text,
  event_type text,
  payload jsonb,
  received_at timestamptz default now(),
  handled boolean default false,
  handling_notes text
);

-- 13. notifications
create table if not exists notifications (
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
create table if not exists audit_logs (
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
create table if not exists delivery_addresses (
  id bigserial primary key,
  user_id uuid references profiles(id),
  label text,
  address jsonb,
  phone text,
  created_at timestamptz default now()
);

-- 16. materialized view: daily revenue
create materialized view if not exists mv_daily_revenue as
select
  date_trunc('day', o.created_at) as day,
  coalesce(sum(p.amount),0) as revenue,
  count(distinct o.id) as orders_count
from orders o
join payments p on p.order_id = o.id
where p.status = 'succeeded'
group by date_trunc('day', o.created_at)
order by day desc;

-- Helpful indexes
create index if not exists idx_orders_user on orders(user_id);
create index if not exists idx_orders_vendor on orders(vendor_id);
create index if not exists idx_payments_status on payments(status);

-- End migration
