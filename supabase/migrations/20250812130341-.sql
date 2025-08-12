-- Ensure pgcrypto for gen_random_uuid
create extension if not exists pgcrypto;

-- 1) Add TJ column on orders
alter table if exists public.orders
  add column if not exists tj jsonb;

-- 2) Create transaction logs table
create table if not exists public.tj_transaction_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid null references public.orders(id) on delete set null,
  transaction_id text null,
  session_id text null,
  payment_intent_id text null,
  payload jsonb not null,
  created_at timestamptz default now()
);

-- Indexes for faster lookups
create index if not exists idx_tj_transaction_id on public.tj_transaction_logs (transaction_id);
create index if not exists idx_tj_session_id on public.tj_transaction_logs (session_id);

-- Enable RLS (no broad policies; Edge Functions use service role)
alter table public.tj_transaction_logs enable row level security;

-- Optional restrictive policies (deny all by default)
-- You can later add admin-read policies using your RBAC helpers
