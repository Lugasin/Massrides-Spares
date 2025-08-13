-- Enable required extensions
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- App roles enum
do $$ begin
  create type public.app_role as enum ('super_admin','admin','vendor','customer','guest');
exception when duplicate_object then null; end $$;

-- User profiles
create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  email text not null,
  full_name text,
  phone text,
  address text,
  city text,
  state text,
  zip_code text,
  country text,
  company_name text,
  role public.app_role not null default 'customer',
  website_url text,
  avatar_url text,
  bio text,
  is_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add FK to auth.users (no IF NOT EXISTS due to Postgres limitation)
alter table public.user_profiles
  add constraint fk_user_profiles_user foreign key (user_id) references auth.users(id) on delete cascade;

alter table public.user_profiles enable row level security;

-- user_roles table and role helper
create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.user_roles where user_id = _user_id and role = _role
  )
$$;

-- Update timestamp trigger
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_user_profiles_updated_at before update on public.user_profiles
for each row execute function public.update_updated_at_column();

-- RLS policies for profiles and roles
create policy if not exists "Users can view their profile" on public.user_profiles
for select to authenticated
using (auth.uid() = user_id or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));

create policy if not exists "Users can insert own profile" on public.user_profiles
for insert to authenticated
with check (auth.uid() = user_id);

create policy if not exists "Users can update own profile" on public.user_profiles
for update to authenticated
using (auth.uid() = user_id or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));

create policy if not exists "Users can see own roles" on public.user_roles
for select to authenticated
using (auth.uid() = user_id or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));

create policy if not exists "Admins manage roles" on public.user_roles
for all to authenticated
using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'))
with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));

-- Categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  image_url text,
  created_at timestamptz default now()
);
alter table public.categories enable row level security;
create policy if not exists "Categories are public" on public.categories for select using (true);

-- Spare parts
create table if not exists public.spare_parts (
  id uuid primary key default gen_random_uuid(),
  part_number text,
  name text not null,
  description text,
  category text,
  brand text,
  price numeric(12,2) not null default 0,
  availability_status text default 'in_stock',
  stock_quantity integer default 0,
  featured boolean default false,
  images jsonb,
  technical_specs jsonb,
  compatibility text[],
  warranty text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.spare_parts enable row level security;
create policy if not exists "Spare parts are public readable" on public.spare_parts for select using (true);

create trigger trg_spare_parts_updated_at before update on public.spare_parts
for each row execute function public.update_updated_at_column();

-- Compatibility
create table if not exists public.spare_part_compatibility (
  id uuid primary key default gen_random_uuid(),
  spare_part_id uuid not null references public.spare_parts(id) on delete cascade,
  equipment text not null
);
alter table public.spare_part_compatibility enable row level security;
create policy if not exists "Compatibility public read" on public.spare_part_compatibility for select using (true);

-- User carts
create table if not exists public.user_carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  created_at timestamptz default now()
);
alter table public.user_carts enable row level security;
create policy if not exists "Users can manage own carts" on public.user_carts
for all to authenticated
using (exists (select 1 from public.user_profiles p where p.id = user_carts.user_id and p.user_id = auth.uid()))
with check (exists (select 1 from public.user_profiles p where p.id = user_carts.user_id and p.user_id = auth.uid()));

-- Cart items
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.user_carts(id) on delete cascade,
  spare_part_id uuid not null references public.spare_parts(id),
  quantity integer not null default 1
);
alter table public.cart_items enable row level security;
create policy if not exists "Users manage items in their carts" on public.cart_items
for all to authenticated
using (exists (select 1 from public.user_carts c join public.user_profiles p on p.id = c.user_id where c.id = cart_items.cart_id and p.user_id = auth.uid()))
with check (exists (select 1 from public.user_carts c join public.user_profiles p on p.id = c.user_id where c.id = cart_items.cart_id and p.user_id = auth.uid()));

-- Guest carts (permissive; consider replacing with edge functions for stricter control)
create table if not exists public.guest_carts (
  id uuid primary key default gen_random_uuid(),
  session_id text unique not null,
  created_at timestamptz default now()
);
alter table public.guest_carts enable row level security;
create policy if not exists "Guests can manage guest carts" on public.guest_carts
for all to anon using (true) with check (true);

create table if not exists public.guest_cart_items (
  id uuid primary key default gen_random_uuid(),
  guest_cart_id uuid not null references public.guest_carts(id) on delete cascade,
  spare_part_id uuid not null references public.spare_parts(id),
  quantity integer not null default 1
);
alter table public.guest_cart_items enable row level security;
create policy if not exists "Guests can manage guest cart items" on public.guest_cart_items
for all to anon using (true) with check (true);

-- Orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.user_profiles(id) on delete set null,
  order_number text unique not null,
  status text not null default 'pending',
  payment_status text not null default 'pending',
  total_amount numeric(12,2) not null default 0,
  shipping_address jsonb,
  billing_address jsonb,
  notes text,
  payment_intent_id text,
  stripe_session_id text,
  tj jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.orders enable row level security;
create policy if not exists "Users can read own orders" on public.orders
for select to authenticated
using (exists (select 1 from public.user_profiles p where p.id = orders.user_id and p.user_id = auth.uid()) or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));
create policy if not exists "Users can insert their orders" on public.orders
for insert to authenticated
with check (exists (select 1 from public.user_profiles p where p.id = orders.user_id and p.user_id = auth.uid()));
create policy if not exists "Users can update own orders" on public.orders
for update to authenticated
using (exists (select 1 from public.user_profiles p where p.id = orders.user_id and p.user_id = auth.uid()) or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));

create trigger trg_orders_updated_at before update on public.orders
for each row execute function public.update_updated_at_column();

-- Order items
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  spare_part_id uuid not null references public.spare_parts(id),
  quantity integer not null default 1,
  unit_price numeric(12,2) not null default 0
);
alter table public.order_items enable row level security;
create policy if not exists "Users manage items in their orders" on public.order_items
for all to authenticated
using (exists (select 1 from public.orders o join public.user_profiles p on p.id = o.user_id where o.id = order_items.order_id and p.user_id = auth.uid()))
with check (exists (select 1 from public.orders o join public.user_profiles p on p.id = o.user_id where o.id = order_items.order_id and p.user_id = auth.uid()));

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  action_url text,
  read_at timestamptz,
  created_at timestamptz default now()
);
alter table public.notifications enable row level security;
create policy if not exists "Users read own notifications" on public.notifications
for select to authenticated
using (exists (select 1 from public.user_profiles p where p.id = notifications.user_id and p.user_id = auth.uid()));
create policy if not exists "Users insert own notifications" on public.notifications
for insert to authenticated
with check (exists (select 1 from public.user_profiles p where p.id = notifications.user_id and p.user_id = auth.uid()));

-- Conversations and messages for messaging system
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_1_id uuid not null references public.user_profiles(id) on delete cascade,
  participant_2_id uuid not null references public.user_profiles(id) on delete cascade,
  last_message_at timestamptz default now(),
  created_at timestamptz default now()
);
alter table public.conversations enable row level security;
create policy if not exists "Participants can access conversations" on public.conversations
for all to authenticated
using (exists (select 1 from public.user_profiles p where p.id in (conversations.participant_1_id, conversations.participant_2_id) and p.user_id = auth.uid()))
with check (exists (select 1 from public.user_profiles p where p.id in (conversations.participant_1_id, conversations.participant_2_id) and p.user_id = auth.uid()));

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.user_profiles(id) on delete cascade,
  recipient_id uuid not null references public.user_profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now(),
  read_at timestamptz
);
alter table public.messages enable row level security;
create policy if not exists "Participants can manage messages" on public.messages
for all to authenticated
using (exists (select 1 from public.user_profiles p where p.user_id = auth.uid() and p.id in (messages.sender_id, messages.recipient_id)))
with check (exists (select 1 from public.user_profiles p where p.user_id = auth.uid() and p.id in (messages.sender_id, messages.recipient_id)));

-- TJ transaction logs
create table if not exists public.tj_transaction_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid,
  transaction_id text,
  session_id text,
  payment_intent_id text,
  payload jsonb not null,
  created_at timestamptz default now()
);
alter table public.tj_transaction_logs enable row level security;
create policy if not exists "Admins read tj logs" on public.tj_transaction_logs
for select to authenticated
using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'super_admin'));

create index if not exists idx_tj_transaction_id on public.tj_transaction_logs(transaction_id);
create index if not exists idx_tj_session_id on public.tj_transaction_logs(session_id);

-- Auto-create profile on auth user creation
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_profiles (user_id, email, full_name, role, is_verified)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''), 'customer', false)
  on conflict (user_id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();