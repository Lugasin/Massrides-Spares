-- =====================================================
-- Vendor access, finance visibility, and order RLS hardening
-- Migration: 20260410000002_vendor_access_and_finance_rls.sql
-- =====================================================

-- Keep the live ownership model keyed to user_profiles.id.
create or replace function public.current_profile_id(_user_id uuid default auth.uid())
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select up.id
  from public.user_profiles up
  where up.user_id = _user_id
  limit 1;
$$;

-- =====================================================
-- PRODUCTS
-- =====================================================

alter table public.products enable row level security;

drop policy if exists "Public read products" on public.products;
drop policy if exists "Public read active products" on public.products;
drop policy if exists "Vendors can manage their own products" on public.products;
drop policy if exists "Vendors manage own products" on public.products;
drop policy if exists "Admins can manage all products" on public.products;
drop policy if exists "Service role read products" on public.products;
drop policy if exists "Service role manage products" on public.products;

create policy "Public read active products"
on public.products
for select
to anon, authenticated
using (coalesce(is_active, true) = true);

create policy "Vendors manage own products"
on public.products
for all
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::text)
  or public.is_super_admin()
  or public.current_profile_id() = vendor_id
)
with check (
  public.has_role(auth.uid(), 'admin'::text)
  or public.is_super_admin()
  or public.current_profile_id() = vendor_id
);

create policy "Service role manage products"
on public.products
for all
to service_role
using (true)
with check (true);

grant select on public.products to anon, authenticated, service_role;
grant insert, update, delete on public.products to authenticated, service_role;

-- =====================================================
-- INVENTORY
-- =====================================================

alter table public.inventory enable row level security;

drop policy if exists "Authenticated read inventory" on public.inventory;
drop policy if exists "Vendors manage own inventory" on public.inventory;
drop policy if exists "Service role manage inventory" on public.inventory;

create policy "Vendors manage own inventory"
on public.inventory
for all
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::text)
  or public.is_super_admin()
  or public.current_profile_id() = vendor_id
  or exists (
    select 1
    from public.products p
    where p.id = inventory.product_id
      and p.vendor_id = public.current_profile_id()
  )
)
with check (
  public.has_role(auth.uid(), 'admin'::text)
  or public.is_super_admin()
  or public.current_profile_id() = vendor_id
  or exists (
    select 1
    from public.products p
    where p.id = inventory.product_id
      and p.vendor_id = public.current_profile_id()
  )
);

create policy "Service role manage inventory"
on public.inventory
for all
to service_role
using (true)
with check (true);

grant select, insert, update, delete on public.inventory to authenticated, service_role;

-- =====================================================
-- INVENTORY LOGS
-- =====================================================

alter table public.inventory_logs enable row level security;

drop policy if exists "Vendors read own inventory logs" on public.inventory_logs;
drop policy if exists "Vendors insert own inventory logs" on public.inventory_logs;
drop policy if exists "Service role manage inventory logs" on public.inventory_logs;

create policy "Vendors read own inventory logs"
on public.inventory_logs
for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::text)
  or public.is_super_admin()
  or public.current_profile_id() = vendor_id
  or exists (
    select 1
    from public.products p
    where p.id = inventory_logs.product_id
      and p.vendor_id = public.current_profile_id()
  )
);

create policy "Vendors insert own inventory logs"
on public.inventory_logs
for insert
to authenticated
with check (
  public.has_role(auth.uid(), 'admin'::text)
  or public.is_super_admin()
  or public.current_profile_id() = vendor_id
  or exists (
    select 1
    from public.products p
    where p.id = inventory_logs.product_id
      and p.vendor_id = public.current_profile_id()
  )
);

create policy "Service role manage inventory logs"
on public.inventory_logs
for all
to service_role
using (true)
with check (true);

grant select, insert on public.inventory_logs to authenticated, service_role;

-- =====================================================
-- ORDERS
-- =====================================================

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "Users view own orders" on public.orders;
drop policy if exists "Users can read own orders" on public.orders;
drop policy if exists "Allow customer access to their own orders" on public.orders;
drop policy if exists "Allow vendor access to orders with their parts" on public.orders;
drop policy if exists "Admins can manage all orders" on public.orders;
drop policy if exists "Allow all access to admins" on public.orders;
drop policy if exists "Allow service role read orders" on public.orders;

create policy "Orders readable by customers, vendors, and staff"
on public.orders
for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::text)
  or public.is_super_admin()
  or public.current_profile_id() = user_id
  or public.current_profile_id() = vendor_id
);

create policy "Service role manage orders"
on public.orders
for all
to service_role
using (true)
with check (true);

drop policy if exists "Users can read own order items" on public.order_items;
drop policy if exists "Users can manage own order items" on public.order_items;
drop policy if exists "Admins can manage all order items" on public.order_items;

create policy "Order items readable by customers, vendors, and staff"
on public.order_items
for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::text)
  or public.is_super_admin()
  or exists (
    select 1
    from public.orders o
    where o.id = order_items.order_id
      and (
        o.user_id = public.current_profile_id()
        or o.vendor_id = public.current_profile_id()
      )
  )
);

create policy "Service role manage order items"
on public.order_items
for all
to service_role
using (true)
with check (true);

grant select on public.orders to authenticated, service_role;
grant select on public.order_items to authenticated, service_role;

-- =====================================================
-- PAYMENTS
-- =====================================================

alter table public.payments enable row level security;

drop policy if exists "Users can view own payments" on public.payments;
drop policy if exists "Allow service role read payments" on public.payments;

create policy "Payments readable by customers, vendors, and staff"
on public.payments
for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::text)
  or public.is_super_admin()
  or exists (
    select 1
    from public.orders o
    where o.id = payments.order_id
      and (
        o.user_id = public.current_profile_id()
        or o.vendor_id = public.current_profile_id()
      )
  )
);

create policy "Service role manage payments"
on public.payments
for all
to service_role
using (true)
with check (true);

grant select on public.payments to authenticated, service_role;

-- =====================================================
-- PAYOUTS
-- =====================================================

alter table public.payouts enable row level security;

drop policy if exists "Payouts readable by owners and staff" on public.payouts;
drop policy if exists "Allow service role read payouts" on public.payouts;

create policy "Payouts readable by owners and staff"
on public.payouts
for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::text)
  or public.is_super_admin()
  or public.current_profile_id() = vendor_id
);

create policy "Service role manage payouts"
on public.payouts
for all
to service_role
using (true)
with check (true);

grant select on public.payouts to authenticated, service_role;

-- =====================================================
-- FINANCIAL AUDIT LOGS
-- =====================================================

alter table public.financial_audit_logs enable row level security;

drop policy if exists "Allow authenticated read" on public.financial_audit_logs;
drop policy if exists "Allow anon read audit_logs" on public.financial_audit_logs;
drop policy if exists "Allow service role audit_logs" on public.financial_audit_logs;
drop policy if exists "Financial audit logs readable by owners and staff" on public.financial_audit_logs;

create policy "Financial audit logs readable by owners and staff"
on public.financial_audit_logs
for select
to authenticated
using (
  public.has_role(auth.uid(), 'admin'::text)
  or public.is_super_admin()
);

create policy "Service role manage financial audit logs"
on public.financial_audit_logs
for all
to service_role
using (true)
with check (true);

grant select on public.financial_audit_logs to authenticated, service_role;
