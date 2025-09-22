-- RLS Policies (examples)

-- ENABLE RLS where required
alter table profiles enable row level security;
alter table vendors enable row level security;
alter table products enable row level security;
alter table orders enable row level security;
alter table payments enable row level security;
alter table notifications enable row level security;

-- profiles: select/update own profile
create policy "profiles_self_select" on profiles for select using ( auth.uid() = id );
create policy "profiles_self_update" on profiles for update using ( auth.uid() = id ) with check ( auth.uid() = id );

-- products: public select active; vendors manage their own products
create policy "products_public_select" on products for select using ( active = true );
create policy "products_vendor_manage" on products for all
  using ( (exists(select 1 from profiles p join vendors v on v.owner_id = p.id where p.id = auth.uid() and v.id = vendor_id)) )
  with check ( (exists(select 1 from profiles p join vendors v on v.owner_id = p.id where p.id = auth.uid() and v.id = vendor_id)) );

-- orders: customers see own; vendors see their orders
create policy "orders_customer_select" on orders for select using ( auth.uid() = user_id );
create policy "orders_vendor_select" on orders for select using (
  (exists(select 1 from profiles p join vendors v on v.owner_id = p.id where p.id = auth.uid() and v.id = vendor_id))
);

-- notifications: user owns notifications
create policy "notifications_own" on notifications for all using ( auth.uid() = user_id ) with check ( auth.uid() = user_id );

-- Triggers & Helper SQL (audit + inventory reservation/commit/release)

-- Audit trigger function
create or replace function log_table_changes() returns trigger as $$

declare
  actor uuid;
begin
  begin
    actor := current_setting('jwt.claims.user_id', true)::uuid;
  exception when others then
    actor := null;
  end;

  if (TG_OP = 'INSERT') then
    insert into audit_logs(actor_id, current_setting('jwt.claims.role', true), 'CREATE', TG_TABLE_NAME, COALESCE(new.id::text, ''), row_to_json(new));
    return new;
  elsif (TG_OP = 'UPDATE') then
    insert into audit_logs(actor_id, current_setting('jwt.claims.role', true), 'UPDATE', TG_TABLE_NAME, COALESCE(new.id::text, ''), json_build_object('old', row_to_json(old), 'new', row_to_json(new)));
    return new;
  elsif (TG_OP = 'DELETE') then
    insert into audit_logs(actor_id, current_setting('jwt.claims.role', true), 'DELETE', TG_TABLE_NAME, COALESCE(old.id::text, ''), row_to_json(old));
    return old;
  end if;
  return null;
end;
$$ language plpgsql security definer;

-- Attach to high-value tables
create trigger audit_orders after insert or update or delete on orders
for each row execute procedure log_table_changes();
create trigger audit_payments after insert or update or delete on payments
for each row execute procedure log_table_changes();
create trigger audit_products after insert or update or delete on products
for each row execute procedure log_table_changes();

-- Reserve inventory for order (rpc)
create or replace function reserve_inventory_for_order(o_id bigint) returns void as $$

declare
  rec record;
  req_qty int;
  inv record;
  v_id bigint;
begin
  select vendor_id into v_id from orders where id = o_id;
  for rec in select * from order_items where order_id = o_id loop
    req_qty := rec.quantity;
    select * into inv from inventory where product_id = rec.product_id and vendor_id = v_id limit 1;
    if inv is null then
      raise exception 'No inventory record for product %', rec.product_id;
    end if;
    if (inv.quantity - inv.reserved) < req_qty then
      raise exception 'Insufficient stock for product %', rec.product_id;
    end if;
    update inventory set reserved = reserved + req_qty where id = inv.id;
  end loop;
end;
$$ language plpgsql;

-- Release inventory for order (rpc)
create or replace function release_inventory_for_order(o_id bigint) returns void as $$

declare
  rec record;
  inv record;
  v_id bigint;
begin
  select vendor_id into v_id from orders where id = o_id;
  for rec in select * from order_items where order_id = o_id loop
    select * into inv from inventory where product_id = rec.product_id and vendor_id = v_id limit 1;
    if inv is not null then
      update inventory set reserved = greatest(0, reserved - rec.quantity) where id = inv.id;
    end if;
  end loop;
end;
$$ language plpgsql;

-- Commit inventory for product (rpc)
create or replace function commit_inventory_for_product(p_product_id bigint, p_vendor_id bigint, p_qty integer) returns void as $$

declare
  inv record;
begin
  select * into inv from inventory where product_id = p_product_id and vendor_id = p_vendor_id limit 1;
  if inv is null then
    raise exception 'No inventory record for product %', p_product_id;
  end if;
  update inventory set
    reserved = greatest(0, reserved - p_qty),
    quantity = greatest(0, quantity - p_qty)
  where id = inv.id;
end;
$$ language plpgsql;
