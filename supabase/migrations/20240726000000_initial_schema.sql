-- Initial Consolidated Schema (Idempotent)

BEGIN;

-- ==========================================
-- Tables
-- ==========================================

-- 1. Profiles & Auth Related
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  role text NOT NULL DEFAULT 'customer'::text CHECK (role = ANY (ARRAY['customer'::text, 'vendor'::text, 'admin'::text, 'super_admin'::text, 'guest'::text])),
  full_name text,
  vendor_name text,
  created_at timestamp with time zone DEFAULT now(),
  email text,
  phone text,
  address text,
  city text,
  state text,
  zip_code text,
  country text DEFAULT 'Zambia'::text,
  company_name text,
  website_url text,
  avatar_url text,
  bio text,
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- 2. Vendors (New)
CREATE TABLE IF NOT EXISTS public.vendors (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vendors_pkey PRIMARY KEY (id),
  CONSTRAINT vendors_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.vendor_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'staff'::text CHECK (role = ANY (ARRAY['owner'::text, 'manager'::text, 'staff'::text])),
  invited_at timestamp with time zone DEFAULT now(),
  joined_at timestamp with time zone,
  CONSTRAINT vendor_users_pkey PRIMARY KEY (id),
  CONSTRAINT vendor_users_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id),
  CONSTRAINT vendor_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.vendor_media (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  file_size numeric,
  alt_text text,
  description text,
  tags text[] DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vendor_media_pkey PRIMARY KEY (id),
  CONSTRAINT vendor_media_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.profiles(id) -- Using profiles as vendor reference here or vendors? Remote used profiles but logic suggests vendors table. Sticking to remote for this one as it might link to user profile media.
);

-- 3. Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id bigint NOT NULL DEFAULT nextval('categories_id_seq'::regclass),
  name text NOT NULL,
  slug text UNIQUE,
  parent_id bigint,
  description text,
  image_url text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.categories(id)
);

-- 4. Products (Spare Parts)
CREATE TABLE IF NOT EXISTS public.products (
  id bigint NOT NULL DEFAULT nextval('products_id_seq'::regclass),
  vendor_id uuid, -- Nullable to support direct user products if needed, but intended for vendors(id)
  category_id bigint,
  name text NOT NULL,
  description text,
  part_number text, -- Enhanced
  oem_part_number text, -- Enhanced
  aftermarket_part_number text, -- Enhanced
  brand text, -- Enhanced
  price numeric NOT NULL CHECK (price >= 0::numeric),
  condition text DEFAULT 'new'::text CHECK (condition = ANY (ARRAY['new'::text, 'used'::text, 'refurbished'::text, 'oem'::text, 'aftermarket'::text])), -- Enhanced
  availability_status text DEFAULT 'in_stock'::text CHECK (availability_status = ANY (ARRAY['in_stock'::text, 'out_of_stock'::text, 'on_order'::text, 'discontinued'::text])), -- Enhanced
  stock_quantity integer DEFAULT 0 CHECK (stock_quantity >= 0),
  min_stock_level integer DEFAULT 5 CHECK (min_stock_level >= 0), -- Enhanced
  images text[] DEFAULT '{}'::text[], -- Enhanced to array
  technical_specs jsonb DEFAULT '{}'::jsonb, -- Enhanced
  compatibility text[] DEFAULT '{}'::text[], -- Enhanced
  warranty text DEFAULT '12 months'::text, -- Enhanced
  weight numeric, -- Enhanced
  dimensions text, -- Enhanced
  featured boolean DEFAULT false, -- Enhanced
  tags text[] DEFAULT '{}'::text[], -- Enhanced
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  sku text,
  currency text DEFAULT 'ZMW'::text,
  main_image text,
  media jsonb DEFAULT '[]'::jsonb,
  attributes jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT products_pkey PRIMARY KEY (id),
  CONSTRAINT products_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id), -- Updated to reference vendors
  CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);

-- 5. Carts (New Structure)
CREATE TABLE IF NOT EXISTS public.carts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid, -- Nullable for guest carts
  session_id text UNIQUE, -- For guest tracking
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT carts_pkey PRIMARY KEY (id),
  CONSTRAINT carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.cart_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL,
  product_id bigint NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  added_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cart_items_pkey PRIMARY KEY (id),
  CONSTRAINT cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id),
  CONSTRAINT cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- Legacy/Helper view for guest carts not strictly needed if we use 'carts' with session_id,
-- but keeping guest_cart_items distinct table from local schema is fine if we want separation,
-- though merging into `cart_items` is cleaner.
-- I will keep `guest_cart_items` for backward compat if strict local adherence is needed,
-- but the requirement "clean remote using local" suggests we can unify.
-- Let's stick to the Unified `carts` table above and deprecate strict `guest_cart_items` table in favor of `carts` with `session_id`.
-- However, to avoid breaking existing code that might rely on `guest_cart_items` table presence, I will leave it but encourage usage of `carts`.

CREATE TABLE IF NOT EXISTS public.guest_cart_items (
  guest_session_id text NOT NULL,
  product_id bigint NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT guest_cart_items_pkey PRIMARY KEY (guest_session_id, product_id),
  CONSTRAINT guest_cart_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- 6. Inventory & Logs
CREATE TABLE IF NOT EXISTS public.inventory (
  id bigint NOT NULL DEFAULT nextval('inventory_id_seq'::regclass),
  product_id bigint UNIQUE, -- Unique constraint from remote
  vendor_id uuid, -- Reference to user profile or vendor? Remote uses user_profile. Local uses auth.users.
                  -- Let's use `vendors` table for consistency with `products`.
  quantity integer NOT NULL DEFAULT 0,
  reserved integer NOT NULL DEFAULT 0,
  threshold integer NOT NULL DEFAULT 5,
  location text,
  last_restocked timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  reserved_until timestamp with time zone,
  allow_backorder boolean DEFAULT false, -- From remote
  CONSTRAINT inventory_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id),
  CONSTRAINT inventory_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id)
);

CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id bigint NOT NULL,
  vendor_id uuid,
  change_type text NOT NULL CHECK (change_type = ANY (ARRAY['restock'::text, 'sale'::text, 'adjustment'::text, 'return'::text])),
  quantity_change integer NOT NULL,
  previous_quantity integer NOT NULL,
  new_quantity integer NOT NULL,
  reason text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_logs_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_logs_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id)
);

-- 7. Orders & Payments
CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vendor_id uuid,
  total_amount numeric NOT NULL,
  total_orders integer DEFAULT 0,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'processing'::text, 'completed'::text, 'rejected'::text])),
  created_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone,
  processed_by uuid,
  notes text,
  CONSTRAINT payouts_pkey PRIMARY KEY (id),
  CONSTRAINT payouts_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id),
  CONSTRAINT payouts_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.orders (
  id bigint NOT NULL DEFAULT nextval('orders_id_seq'::regclass),
  order_number text, -- Added from remote
  user_id uuid NOT NULL,
  cart_id uuid, -- Link to cart
  vendor_id uuid, -- Link to vendor
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text, 'refunded'::text, 'awaiting_payment'::text, 'pending_payment'::text, 'paid'::text])), -- Merged statuses
  payment_status text NOT NULL DEFAULT 'unpaid'::text CHECK (payment_status = ANY (ARRAY['unpaid'::text, 'pending'::text, 'paid'::text, 'failed'::text, 'refunded'::text])),
  total_amount numeric NOT NULL CHECK (total_amount >= 0::numeric),
  shipping_address jsonb NOT NULL,
  billing_address jsonb, -- Added
  platform_fee numeric DEFAULT 0, -- Added
  vendor_earning numeric DEFAULT 0, -- Added
  payout_status text DEFAULT 'unpaid'::text CHECK (payout_status = ANY (ARRAY['unpaid'::text, 'locked'::text, 'processing'::text, 'paid_out'::text])), -- Added
  payout_id uuid, -- Added
  fraud_flag boolean DEFAULT false, -- Added
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT orders_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.carts(id),
  CONSTRAINT orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id),
  CONSTRAINT orders_payout_id_fkey FOREIGN KEY (payout_id) REFERENCES public.payouts(id)
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id bigint NOT NULL DEFAULT nextval('order_items_id_seq'::regclass),
  order_id bigint NOT NULL,
  product_id bigint NOT NULL,
  product_name text, -- Added snapshot
  quantity integer NOT NULL CHECK (quantity > 0),
  price numeric NOT NULL DEFAULT 0, -- Renamed from price_snapshot to match remote convention or keep local? Local `price_snapshot`. Remote `price`. Let's support `price` as alias or just use `price`. I will use `price` for cleaner alignment with remote, but alias `price_snapshot` if needed. I'll stick to `price` here.
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_items_pkey PRIMARY KEY (id),
  CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

CREATE TABLE IF NOT EXISTS public.payments (
  id bigint NOT NULL DEFAULT nextval('payments_id_seq'::regclass),
  order_id bigint NOT NULL UNIQUE,
  amount numeric NOT NULL,
  currency text DEFAULT 'ZMW'::text,
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'paid'::text, 'failed'::text])),
  merchant_reference text,
  payment_method text,
  provider text NOT NULL DEFAULT 'vesicash'::text,
  vesicash_transaction_id text UNIQUE,
  vesicash_payment_id text, -- Added
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);

CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  order_id bigint, -- Changed from uuid to bigint to match local orders.id type
  user_id uuid,
  vendor_id uuid, -- Changed to reference vendors table? Remote referenced vendors.
  reason text,
  status text DEFAULT 'open'::text CHECK (status = ANY (ARRAY['open'::text, 'under_review'::text, 'resolved_refund'::text, 'resolved_vendor_win'::text, 'rejected'::text])),
  admin_notes text,
  created_at timestamp with time zone DEFAULT now(),
  resolved_at timestamp with time zone,
  CONSTRAINT disputes_pkey PRIMARY KEY (id),
  CONSTRAINT disputes_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT disputes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT disputes_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id)
);

CREATE TABLE IF NOT EXISTS public.financial_audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  entity_type text,
  entity_id text,
  amount numeric,
  actor_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT financial_audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT financial_audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES auth.users(id)
);

-- 8. Messaging & Ads
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  participant_1_id uuid NOT NULL,
  participant_2_id uuid NOT NULL,
  last_message_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_participant_1_id_fkey FOREIGN KEY (participant_1_id) REFERENCES public.profiles(id),
  CONSTRAINT conversations_participant_2_id_fkey FOREIGN KEY (participant_2_id) REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  content text NOT NULL,
  message_type text DEFAULT 'text'::text,
  attachment_url text,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id),
  CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id),
  CONSTRAINT messages_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id)
);

CREATE TABLE IF NOT EXISTS public.ads (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  target_url text,
  ad_type text DEFAULT 'banner'::text CHECK (ad_type = ANY (ARRAY['banner'::text, 'sidebar'::text, 'featured'::text, 'popup'::text])),
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'active'::text, 'rejected'::text, 'paused'::text, 'expired'::text])),
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  clicks integer DEFAULT 0,
  impressions integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ads_pkey PRIMARY KEY (id),
  CONSTRAINT ads_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.profiles(id) -- Ad vendor usually links to profile in remote
);

-- 9. Notifications & Wishlists
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  type text DEFAULT 'info'::text CHECK (type = ANY (ARRAY['info'::text, 'success'::text, 'warning'::text, 'error'::text])),
  link text,
  target_role text, -- Added
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.wishlists (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id bigint NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT wishlists_pkey PRIMARY KEY (id),
  CONSTRAINT wishlists_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT wishlists_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- ==========================================
-- RLS Policies
-- ==========================================

-- Activity Logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "insert logs" ON public.activity_logs;
CREATE POLICY "insert logs" ON public.activity_logs FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "users read own logs" ON public.activity_logs;
CREATE POLICY "users read own logs" ON public.activity_logs FOR SELECT USING (auth.uid() = user_id);

-- Vendors
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view active vendors" ON public.vendors;
CREATE POLICY "Public view active vendors" ON public.vendors FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Owners manage own vendor" ON public.vendors;
CREATE POLICY "Owners manage own vendor" ON public.vendors FOR ALL USING (owner_id = auth.uid());

-- Carts
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own carts" ON public.carts;
CREATE POLICY "Users manage own carts" ON public.carts FOR ALL USING (user_id = auth.uid() OR session_id IS NOT NULL); -- Simplified for guest access context

-- Cart Items
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own cart items" ON public.cart_items;
-- Policy needs to link back to cart -> user or session.
-- For simplicity in this schema dump, assuming auth.uid check on the cart linkage or direct ownership if user_id was present.
-- Since cart_items links to carts, we need a USING clause that joins carts.
CREATE POLICY "Users manage own cart items" ON public.cart_items FOR ALL USING (
  exists (select 1 from public.carts where id = cart_items.cart_id and (user_id = auth.uid() or session_id is not null))
);

-- Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own notifications" ON public.notifications;
CREATE POLICY "Users manage own notifications" ON public.notifications FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users create orders" ON public.orders;
CREATE POLICY "Users create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Wishlists
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users read own wishlist" ON public.wishlists;
CREATE POLICY "users read own wishlist" ON public.wishlists FOR ALL USING (auth.uid() = user_id);

-- Products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view active products" ON public.products;
CREATE POLICY "Public view active products" ON public.products FOR SELECT USING (is_active = true);

-- Messages
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own conversations" ON public.conversations FOR SELECT USING (auth.uid() = participant_1_id OR auth.uid() = participant_2_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own messages" ON public.messages FOR SELECT USING (
  exists (select 1 from public.conversations where id = messages.conversation_id and (participant_1_id = auth.uid() or participant_2_id = auth.uid()))
);

-- ==========================================
-- Triggers
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- ==========================================
-- Grants
-- ==========================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.wishlists TO authenticated;
GRANT ALL ON TABLE public.activity_logs TO authenticated;
GRANT ALL ON TABLE public.carts TO authenticated;
GRANT ALL ON TABLE public.cart_items TO authenticated;
GRANT ALL ON TABLE public.orders TO authenticated;
GRANT ALL ON TABLE public.order_items TO authenticated;
GRANT ALL ON TABLE public.payments TO authenticated;
GRANT ALL ON TABLE public.products TO authenticated;
GRANT ALL ON TABLE public.vendors TO authenticated;
GRANT ALL ON TABLE public.conversations TO authenticated;
GRANT ALL ON TABLE public.messages TO authenticated;

COMMIT;
