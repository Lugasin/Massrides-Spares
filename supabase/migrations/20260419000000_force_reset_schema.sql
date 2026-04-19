-- Force recreate all essential tables and RLS policies
-- This migration replaces all the broken ones and creates a clean schema

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop all existing tables to start fresh
DROP TABLE IF EXISTS public.vendor_payouts CASCADE;
DROP TABLE IF EXISTS public.fx_rates CASCADE;
DROP TABLE IF EXISTS public.vendor_orders CASCADE;
DROP TABLE IF EXISTS public.ads CASCADE;
DROP TABLE IF EXISTS public.vendor_media CASCADE;
DROP TABLE IF EXISTS public.disputes CASCADE;
DROP TABLE IF EXISTS public.tj_payment_methods CASCADE;
DROP TABLE IF EXISTS public.guest_cart_items CASCADE;
DROP TABLE IF EXISTS public.guest_carts CASCADE;
DROP TABLE IF EXISTS public.quotes CASCADE;
DROP TABLE IF EXISTS public.quote_items CASCADE;
DROP TABLE IF EXISTS public.backup_cart_items CASCADE;
DROP TABLE IF EXISTS public.backup_user_carts CASCADE;
DROP TABLE IF EXISTS public.backup_orders CASCADE;
DROP TABLE IF EXISTS public.backup_payments CASCADE;
DROP TABLE IF EXISTS public.backup_spare_parts CASCADE;
DROP TABLE IF EXISTS public.financial_audit_logs CASCADE;
DROP TABLE IF EXISTS public.payouts CASCADE;
DROP TABLE IF EXISTS public.refunds CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.email_logs CASCADE;
DROP TABLE IF EXISTS public.inventory_logs CASCADE;
DROP TABLE IF EXISTS public.push_subscriptions CASCADE;
DROP TABLE IF EXISTS public.vendor_wallets CASCADE;
DROP TABLE IF EXISTS public.payout_requests CASCADE;
DROP TABLE IF EXISTS public.system_settings CASCADE;
DROP TABLE IF EXISTS public.activity_logs CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.wishlists CASCADE;
DROP TABLE IF EXISTS public.inventory CASCADE;
DROP TABLE IF EXISTS public.cart_items CASCADE;
DROP TABLE IF EXISTS public.user_carts CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.vendors CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Recreate essential tables with proper structure

-- Categories table
CREATE TABLE public.categories (
    id bigint NOT NULL DEFAULT nextval('categories_id_seq'::regclass),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT categories_pkey PRIMARY KEY (id)
);

-- Products table
CREATE TABLE public.products (
    id bigint NOT NULL DEFAULT nextval('products_id_seq'::regclass),
    vendor_id uuid,
    sku text,
    title text NOT NULL,
    description text,
    price numeric(12,2) NOT NULL DEFAULT 0,
    category_id bigint,
    condition text DEFAULT 'new',
    stock_quantity integer DEFAULT 0,
    min_stock_level integer DEFAULT 0,
    is_active boolean DEFAULT true,
    featured boolean DEFAULT false,
    images text[] DEFAULT '{}'::text[],
    attributes jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    part_number text,
    brand text,
    availability_status text DEFAULT 'in_stock',
    CONSTRAINT products_pkey PRIMARY KEY (id),
    CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id)
);

-- Profiles table
CREATE TABLE public.profiles (
    id uuid NOT NULL,
    role text NOT NULL DEFAULT 'customer'::text,
    full_name text,
    vendor_name text,
    created_at timestamp with time zone DEFAULT now(),
    email text,
    updated_at timestamp with time zone DEFAULT now(),
    company_name text,
    phone text,
    is_active boolean DEFAULT true,
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- Orders table
CREATE TABLE public.orders (
    id bigint NOT NULL DEFAULT nextval('orders_id_seq'::regclass),
    order_number text NOT NULL UNIQUE,
    user_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    total_amount numeric(12,2) NOT NULL DEFAULT 0,
    billing_address jsonb,
    shipping_address jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT orders_pkey PRIMARY KEY (id)
);

-- Order items table
CREATE TABLE public.order_items (
    id bigint NOT NULL DEFAULT nextval('order_items_id_seq'::regclass),
    order_id bigint NOT NULL,
    product_id bigint NOT NULL,
    quantity integer NOT NULL DEFAULT 1,
    price numeric(12,2) NOT NULL DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT order_items_pkey PRIMARY KEY (id),
    CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE,
    CONSTRAINT order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- System settings table
CREATE TABLE public.system_settings (
    key text NOT NULL,
    value jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    updated_by uuid,
    CONSTRAINT system_settings_pkey PRIMARY KEY (key)
);

-- Enable RLS on essential tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);

CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users read own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Public read system_settings" ON public.system_settings FOR SELECT USING (true);

-- Insert default categories
INSERT INTO public.categories (name, slug) VALUES
    ('Engine Parts', 'engine-parts'),
    ('Hydraulic Parts', 'hydraulic-parts'),
    ('Electrical Parts', 'electrical-parts'),
    ('Transmission Parts', 'transmission-parts'),
    ('Cooling System', 'cooling-system'),
    ('Wheels & Tires', 'wheels-tires'),
    ('Drivetrain Parts', 'drivetrain-parts'),
    ('Fuel System', 'fuel-system'),
    ('Steering Parts', 'steering-parts'),
    ('Brake Parts', 'brake-parts'),
    ('Cab & Body', 'cab-body'),
    ('Implements', 'implements')
ON CONFLICT (slug) DO NOTHING;

-- Insert default system settings
INSERT INTO public.system_settings (key, value) VALUES
    ('currency', '{"exchange_rate": 28, "auto_fetch": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;