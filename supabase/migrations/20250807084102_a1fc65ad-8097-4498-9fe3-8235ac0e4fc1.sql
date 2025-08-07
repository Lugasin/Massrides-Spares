-- Drop existing tables if they exist to start fresh
DROP TABLE IF EXISTS public.support_tickets CASCADE;
DROP TABLE IF EXISTS public.wishlists CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.quote_items CASCADE;
DROP TABLE IF EXISTS public.quotes CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.cart_items CASCADE;
DROP TABLE IF EXISTS public.guest_cart_items CASCADE;
DROP TABLE IF EXISTS public.guest_carts CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.product_categories CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.company_partners CASCADE;
DROP TABLE IF EXISTS public.permissions CASCADE;
DROP TABLE IF EXISTS public.role_permissions CASCADE;

-- Create user profiles table
CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  company_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'Zambia',
  role TEXT NOT NULL DEFAULT 'customer',
  website_url TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Create product categories table
CREATE TABLE public.product_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  images TEXT[],
  brand TEXT,
  model TEXT,
  year INTEGER,
  condition TEXT DEFAULT 'new',
  availability_status TEXT DEFAULT 'available',
  specifications JSONB,
  category_id UUID REFERENCES public.product_categories(id),
  vendor_id UUID REFERENCES public.user_profiles(user_id),
  featured BOOLEAN DEFAULT false,
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Create guest carts table
CREATE TABLE public.guest_carts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create guest cart items table
CREATE TABLE public.guest_cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_cart_id UUID NOT NULL REFERENCES public.guest_carts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create cart items table for authenticated users
CREATE TABLE public.cart_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.user_profiles(user_id),
  order_number TEXT,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'pending',
  total_amount NUMERIC NOT NULL,
  billing_address JSONB,
  shipping_address JSONB,
  payment_intent_id TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Create order items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Create quotes table
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_number TEXT NOT NULL,
  client_id UUID NOT NULL REFERENCES public.user_profiles(user_id),
  vendor_id UUID NOT NULL REFERENCES public.user_profiles(user_id),
  status TEXT DEFAULT 'pending',
  total_amount NUMERIC DEFAULT 0,
  valid_until TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Create quote items table
CREATE TABLE public.quote_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.user_profiles(user_id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Create wishlists table for favorites
CREATE TABLE public.wishlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, product_id)
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.user_profiles(user_id),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Create support tickets table
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Create company partners table
CREATE TABLE public.company_partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Create permissions table
CREATE TABLE public.permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create role permissions table
CREATE TABLE public.role_permissions (
  role TEXT NOT NULL,
  permission_id UUID NOT NULL REFERENCES public.permissions(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_partners ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- User profiles policies
CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can manage all profiles" ON public.user_profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Products policies
CREATE POLICY "Everyone can view products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Vendors can manage own products" ON public.products FOR ALL USING (
  vendor_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Guest carts policies
CREATE POLICY "Public can view own guest cart" ON public.guest_carts FOR SELECT USING (
  session_id = current_setting('supabase.guest_session_id', true)
);
CREATE POLICY "Public can create guest cart" ON public.guest_carts FOR INSERT WITH CHECK (true);

-- Guest cart items policies
CREATE POLICY "Public can view own guest cart items" ON public.guest_cart_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.guest_carts WHERE id = guest_cart_id AND session_id = current_setting('supabase.guest_session_id', true))
);
CREATE POLICY "Public can create guest cart items" ON public.guest_cart_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.guest_carts WHERE id = guest_cart_id AND session_id = current_setting('supabase.guest_session_id', true))
);
CREATE POLICY "Public can update own guest cart items" ON public.guest_cart_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.guest_carts WHERE id = guest_cart_id AND session_id = current_setting('supabase.guest_session_id', true))
);

-- Cart items policies
CREATE POLICY "Users can manage own cart items" ON public.cart_items FOR ALL USING (user_id = auth.uid());

-- Orders policies
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create own orders" ON public.orders FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Vendors can view orders with their products" ON public.orders FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.order_items oi 
    JOIN public.products p ON oi.product_id = p.id 
    WHERE oi.order_id = orders.id AND p.vendor_id = auth.uid()
  )
);

-- Order items policies
CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
);
CREATE POLICY "Webhook can insert order items" ON public.order_items FOR INSERT WITH CHECK (true);

-- Quotes policies
CREATE POLICY "Users can view own quotes" ON public.quotes FOR SELECT USING (
  client_id = auth.uid() OR vendor_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Vendors can create quotes" ON public.quotes FOR INSERT WITH CHECK (
  vendor_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);
CREATE POLICY "Users can update own quotes" ON public.quotes FOR UPDATE USING (
  client_id = auth.uid() OR vendor_id = auth.uid() OR 
  EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Quote items policies
CREATE POLICY "Users can view quote items for their quotes" ON public.quote_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND 
    (q.client_id = auth.uid() OR q.vendor_id = auth.uid() OR 
     EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')))
  )
);
CREATE POLICY "Vendors can manage quote items" ON public.quote_items FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.quotes q WHERE q.id = quote_id AND 
    (q.vendor_id = auth.uid() OR 
     EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')))
  )
);

-- Notifications policies
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());

-- Wishlists policies
CREATE POLICY "Users can manage own wishlists" ON public.wishlists FOR ALL USING (user_id = auth.uid());

-- Reviews policies
CREATE POLICY "Everyone can view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Users can create reviews" ON public.reviews FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own reviews" ON public.reviews FOR UPDATE USING (user_id = auth.uid());

-- Support tickets policies
CREATE POLICY "Everyone can create support tickets" ON public.support_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage support tickets" ON public.support_tickets FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Company partners policies
CREATE POLICY "Everyone can view active partners" ON public.company_partners FOR SELECT USING (active = true);
CREATE POLICY "Admins can manage partners" ON public.company_partners FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Create trigger for user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'customer'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create function for updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quote_items_updated_at BEFORE UPDATE ON public.quote_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some basic product categories
INSERT INTO public.product_categories (name, description) VALUES 
('Tractors', 'Agricultural tractors and farming vehicles'),
('Harvesters', 'Combine harvesters and harvesting equipment'),
('Irrigation', 'Irrigation systems and water management'),
('Ploughs', 'Plowing equipment and soil preparation'),
('Seeders', 'Seeding and planting equipment'),
('Sprayers', 'Crop spraying and pesticide application');

-- Insert basic permissions
INSERT INTO public.permissions (name, description) VALUES
('manage_products', 'Can create, edit, and delete products'),
('manage_orders', 'Can view and manage all orders'),
('manage_users', 'Can manage user accounts and roles'),
('view_analytics', 'Can view system analytics and reports'),
('manage_system', 'Can perform system maintenance and configuration');

-- Insert role permissions
INSERT INTO public.role_permissions (role, permission_id) VALUES
('vendor', (SELECT id FROM public.permissions WHERE name = 'manage_products')),
('admin', (SELECT id FROM public.permissions WHERE name = 'manage_products')),
('admin', (SELECT id FROM public.permissions WHERE name = 'manage_orders')),
('admin', (SELECT id FROM public.permissions WHERE name = 'manage_users')),
('admin', (SELECT id FROM public.permissions WHERE name = 'view_analytics')),
('super_admin', (SELECT id FROM public.permissions WHERE name = 'manage_products')),
('super_admin', (SELECT id FROM public.permissions WHERE name = 'manage_orders')),
('super_admin', (SELECT id FROM public.permissions WHERE name = 'manage_users')),
('super_admin', (SELECT id FROM public.permissions WHERE name = 'view_analytics')),
('super_admin', (SELECT id FROM public.permissions WHERE name = 'manage_system'));