Agri Spare — Complete Package: User Flow, SQL Migrations, RLS, Triggers & Supabase Edge Functions
This document contains everything needed to implement the guest→email auth→customer checkout flow, Supabase migrations (SQL), RLS policies, audit & inventory trigger helpers, Supabase Edge Function templates, deployment notes, and frontend integration checklist. Paste SQL into Supabase SQL editor and deploy Edge Functions via Supabase CLI.

1. High-level User Flow
1. Guest browses and adds items to cart (client-side or server-side carts using guest_token).
2. Guest begins checkout → frontend creates an `orders` row with status = 'pending', customer_email and guest_token. No inventory reserved yet.
3. Frontend shows email auth gate (magic link). On email verification, frontend calls `/attach-order-to-user` Edge Function to attach authenticated user_id to the order and set email_verified = true.
4. Frontend calls `/create-tj-session` Edge Function with order_id. This function validates order, reserves inventory (RPC), creates a payments row, calls TJ to create HPP session, saves provider_session_id, and returns hpp_url.
5. Frontend redirects user to TJ HPP. TJ redirects back to APP_RETURN_URL and sends a server-to-server webhook to `/tj-webhook`.
6. `/tj-webhook` verifies signature, logs webhook, finds payment, updates payments.status and orders.status, commits or releases inventory, creates notifications and audit logs.
7. A scheduled function `reservation-cleanup` cancels expired initiated/pending orders and releases inventory.

2. SQL Migration (paste into Supabase SQL editor)

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

3. RLS Policies (examples)

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

4. Triggers & Helper SQL (audit + inventory reservation/commit/release)

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

5. Supabase Edge Function Templates (place under functions/<name>/index.ts)
A. create-tj-session (index.ts)

// create-tj-session/index.ts
// Supabase Edge Function (Deno TypeScript)
// ENV required:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - TJ_API_KEY
// - APP_RETURN_URL

import { serve } from "std/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TJ_API_KEY = Deno.env.get("TJ_API_KEY")!;
const APP_RETURN_URL = Deno.env.get("APP_RETURN_URL")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { fetch });

async function createTjHppSession(order) {
  // TODO: adapt this payload to Transaction Junction's actual API.
  const payload = {
    amount: order.total,
    currency: order.currency || "ZMW",
    order_reference: order.order_reference,
    return_url: `${APP_RETURN_URL}/payment-return?order=${order.order_reference}`,
    customer: {
      email: order.customer_email,
      name: order.customer_name || null
    },
    metadata: { order_id: order.id }
  };

  const res = await fetch("https://api.transactionjunction.example/v1/hpp/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${TJ_API_KEY}`
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TJ create session failed: ${res.status} ${text}`);
  }

  return res.json(); // Expect { hpp_url, session_id, ... }
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    const body = await req.json();
    const { order_id } = body;
    if (!order_id) return new Response(JSON.stringify({ error: "order_id required" }), { status: 400, headers: { "Content-Type": "application/json" }});

    // Fetch order using service role
    const { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .single();

    if (error || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: { "Content-Type": "application/json" }});
    }

    // Require email verified on order
    if (!order.email_verified) return new Response(JSON.stringify({ error: "Order email must be verified before payment" }), { status: 400, headers: { "Content-Type": "application/json" }});

    // Reserve inventory server-side using RPC
    try {
      await supabase.rpc('reserve_inventory_for_order', { o_id: order.id });
    } catch (e) {
      console.error("reserve inventory failed", e);
      return new Response(JSON.stringify({ error: "Failed to reserve inventory: " + e.message }), { status: 400, headers: { "Content-Type": "application/json" }});
    }

    // Create payments row
    const { data: payment, error: payErr } = await supabase
      .from("payments")
      .insert([{
        order_id: order.id,
        vendor_id: order.vendor_id,
        provider: "tj",
        provider_session_id: null,
        amount: order.total,
        currency: order.currency,
        status: "initiated",
        created_at: new Date().toISOString()
      }])
      .select("*")
      .single();

    if (payErr) {
      console.error("create payment error", payErr);
      // release inventory on failure
      await supabase.rpc('release_inventory_for_order', { o_id: order.id });
      return new Response(JSON.stringify({ error: "Failed to create payment record" }), { status: 500, headers: { "Content-Type": "application/json" }});
    }

    // Call TJ API to create HPP session
    const tjResp = await createTjHppSession(order);
    const hppUrl = tjResp.hpp_url || tjResp.redirect_url || tjResp.url;
    const sessionId = tjResp.session_id || tjResp.id || null;

    // Save provider session id and raw payload
    await supabase
      .from("payments")
      .update({ provider_session_id: sessionId, raw_payload: tjResp, updated_at: new Date().toISOString() })
      .eq("id", payment.id);

    // set expires_at on order (e.g., 30 minutes from now)
    await supabase.from("orders").update({ status: "initiated", expires_at: new Date(Date.now() + 30*60*1000).toISOString(), updated_at: new Date().toISOString() }).eq("id", order.id);

    return new Response(JSON.stringify({ hpp_url: hppUrl }), { status: 200, headers: { "Content-Type": "application/json" }});

  } catch (err) {
    console.error("create-tj-session error", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" }});
  }
});

B. attach-order-to-user (index.ts)

// attach-order-to-user/index.ts
// Supabase Edge Function (Deno TypeScript)
// ENV required:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY

import { serve } from "std/server";
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { fetch });

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    const body = await req.json();
    const { order_reference, user_id } = body;
    if (!order_reference || !user_id) return new Response(JSON.stringify({ error: "order_reference and user_id required" }), { status: 400, headers: { "Content-Type": "application/json" }});

    const { data: order, error } = await supabase.from("orders").select("*").eq("order_reference", order_reference).single();
    if (error || !order) return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: { "Content-Type": "application/json" }});

    // Attach user and set email_verified
    await supabase.from("orders").update({ user_id, email_verified: true, updated_at: new Date().toISOString() }).eq("id", order.id);

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" }});
  } catch (err) {
    console.error("attach-order error", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" }});
  }
});

C. tj-webhook (index.ts)

// tj-webhook/index.ts
// Supabase Edge Function (Deno TypeScript)
// ENV required:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY
// - TJ_WEBHOOK_SECRET

import { serve } from "std/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TJ_WEBHOOK_SECRET = Deno.env.get("TJ_WEBHOOK_SECRET")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { fetch });

async function computeHmacHex(message, secret) {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  const arr = Array.from(new Uint8Array(sig));
  return arr.map(b => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a, b) {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
    const raw = await req.text();
    const signature = req.headers.get("x-tj-signature") || "";

    const computed = await computeHmacHex(raw, TJ_WEBHOOK_SECRET);
    if (!timingSafeEqual(computed, signature)) {
      console.warn("Invalid signature: computed", computed, "header", signature);
      return new Response("invalid signature", { status: 400 });
    }

    const payload = JSON.parse(raw);

    // log webhook
    await supabase.from("webhooks_log").insert([{ provider: "tj", event_type: payload.event || payload.type || "unknown", payload, received_at: new Date().toISOString() }]);

    // find payment: try provider_session_id, provider_payment_id, or order_reference via payload
    const sessionId = payload.data?.session_id || payload.data?.provider_session_id || payload.data?.reference || payload.data?.order_reference;
    const paymentId = payload.data?.payment_id || payload.data?.id;

    // try match
    let { data: payments } = await supabase.from("payments").select("*").or(`provider_session_id.eq.${sessionId},provider_payment_id.eq.${paymentId}`).limit(1);

    if (!payments || payments.length === 0) {
      const orderRef = payload.data?.order_reference || payload.data?.metadata?.order_reference;
      if (orderRef) {
        const { data: order } = await supabase.from("orders").select("*").eq("order_reference", orderRef).limit(1).single();
        if (order) {
          const { data: payments2 } = await supabase.from("payments").select("*").eq("order_id", order.id).limit(1);
          payments = payments2;
        }
      }
    }

    if (!payments || payments.length === 0) {
      console.warn("No payment match for webhook", payload);
      return new Response("no payment found", { status: 404 });
    }

    const payment = payments[0];
    const tjStatus = payload.data?.status || payload.status || payload.event;
    let localStatus = "initiated";
    if (["success", "succeeded", "paid", "completed"].includes(String(tjStatus).toLowerCase())) localStatus = "succeeded";
    if (["failed", "declined", "cancelled"].includes(String(tjStatus).toLowerCase())) localStatus = "failed";

    // update payment
    await supabase.from("payments").update({ status: localStatus, provider_payment_id: paymentId || payment.provider_payment_id, raw_payload: payload, updated_at: new Date().toISOString() }).eq("id", payment.id);

    // update order status & inventory commit/release
    const orderStatus = localStatus === "succeeded" ? "paid" : (localStatus === "failed" ? "failed" : "pending");
    await supabase.from("orders").update({ status: orderStatus, payment_provider_ref: paymentId }).eq("id", payment.order_id);

    // If succeeded: commit inventory (reduce quantity and reserved)
    if (localStatus === "succeeded") {
      const { data: items } = await supabase.from("order_items").select("*").eq("order_id", payment.order_id);
      const { data: order } = await supabase.from("orders").select("*").eq("id", payment.order_id).single();
      for (const item of items || []) {
        // commit inventory via RPC
        await supabase.rpc('commit_inventory_for_product', { p_product_id: item.product_id, p_vendor_id: order.vendor_id, p_qty: item.quantity });
      }
    } else if (localStatus === "failed") {
      // release reserved
      await supabase.rpc('release_inventory_for_order', { o_id: payment.order_id });
    }

    // Create notifications: user + vendor owner
    const { data: order } = await supabase.from("orders").select("*").eq("id", payment.order_id).single();
    if (order) {
      const notifs = [];
      if (order.user_id) notifs.push({ user_id: order.user_id, type: "payment", title: "Payment update", message: `Payment ${orderStatus} for order ${order.order_reference}`, data: payload, created_at: new Date().toISOString() });
      if (order.vendor_id) {
        const { data: vendor } = await supabase.from("vendors").select("*").eq("id", order.vendor_id).limit(1).single();
        if (vendor && vendor.owner_id) notifs.push({ user_id: vendor.owner_id, type: "vendor_payment", title: "Order payment", message: `Order ${order.order_reference} is ${orderStatus}`, data: payload, created_at: new Date().toISOString() });
      }
      if (notifs.length) await supabase.from("notifications").insert(notifs);
    }

    return new Response("ok", { status: 200 });

  } catch (err) {
    console.error("tj-webhook error", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" }});
  }
});

D. reservation-cleanup (scheduled function)

// reservation-cleanup/index.ts
// Supabase Edge Function (Deno TypeScript)
// ENV required:
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY

import { serve } from "std/server";
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { fetch });

serve(async (req) => {
  try {
    const { data: staleOrders } = await supabase.from('orders').select('*').in('status', ['pending','initiated']).lt('expires_at', new Date().toISOString()).limit(100);
    for (const order of staleOrders || []) {
      await supabase.rpc('release_inventory_for_order', { o_id: order.id });
      await supabase.from('orders').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', order.id);
      if (order.user_id) {
        await supabase.from('notifications').insert([{ user_id: order.user_id, type: 'order_cancelled', title: 'Order cancelled', message: `Your order ${order.order_reference} was cancelled due to inactive payment.`, created_at: new Date().toISOString() }]);
      }
    }
    return new Response(JSON.stringify({ cancelled: (staleOrders || []).length }), { status: 200, headers: { "Content-Type": "application/json" }});
  } catch (err) {
    console.error("reservation-cleanup error", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { "Content-Type": "application/json" }});
  }
});

6. Frontend / UX Integration Checklist
1. Add-to-cart (guest):
   - Generate guest_token client-side (ULID/UUID) and create a guest_sessions row (optional).
   - Save cart server-side to `carts` with guest_token or keep client-side and create order when starting checkout.

2. Start checkout:
   - Create `orders` and `order_items` via server endpoint `/create-order` (server uses service_role) or via trusted backend function.
   - If guest, set guest_token and customer_email; email_verified=false.

3. Email auth gate:
   - If order.email_verified == false, show quick modal to capture email and send magic link.
   - After user follows magic link and is authenticated, call `/attach-order-to-user` with order_reference and user_id from `supabase.auth.getUser()`.

4. Create TJ session:
   - Call `POST /create-tj-session` with { order_id } once order.email_verified == true.
   - On success, receive { hpp_url } and redirect the user to the HPP.

5. Return & webhook:
   - After returning from TJ HPP, show payment-pending UI and subscribe to realtime or poll orders until status updates to paid/failed.
   - The webhook `/tj-webhook` is authoritative and will update DB.

6. Post-payment and cleanup:
   - If paid: show success, send receipts, vendor notifications, commit inventory.
   - If failed: show error and allow retry; release inventory via webhook logic.
   - Reservation-cleanup runs periodically to cancel expired orders and release reserved inventory.

7. Environment Variables & Deployment Notes
Environment variables (set in Supabase project > Settings > Functions environment):
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY (server-only)
- SUPABASE_ANON_KEY (frontend only)
- TJ_API_KEY
- TJ_WEBHOOK_SECRET
- APP_RETURN_URL
- EMAIL_PROVIDER_API_KEY (optional)

Deployment (Supabase CLI):
1. Install supabase CLI: https://supabase.com/docs/guides/cli
2. Login: `supabase login`
3. Place function folders under `functions/` in your project.
4. Deploy: `supabase functions deploy <function-name> --project-ref YOUR_PROJECT_REF`

Testing checklist:
- Run full guest->email->create-tj-session->simulate webhook flow in TJ sandbox.
- Verify webhooks_log, payments.status, orders.status, inventory reserved/quantity changes, notifications, and audit_logs.

8. Security & Best Practices
- Keep SUPABASE_SERVICE_ROLE_KEY only in server/Edge Function envs. Never expose in frontend.
- Do not store raw card details. Store only provider tokens and references.
- Server-side must enforce email verification before creating payment session.
- Implement rate-limiting and abuse detection on attach-order-to-user and create-tj-session endpoints.
- Use strong HMAC verification for TJ webhook (confirm header and algorithm in TJ docs).
- Rotate keys periodically and monitor webhooks_log and audit_logs for anomalies.

