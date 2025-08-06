-- Drop existing tables
DROP TABLE IF EXISTS public.deliveries CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.menus CASCADE;
DROP TABLE IF EXISTS public.restaurants CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;
DROP TABLE IF EXISTS public.admins CASCADE;

-- Create roles enum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'vendor', 'customer', 'guest');
    END IF;
END$$;

-- Create user profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  company_name TEXT,
  role app_role DEFAULT 'customer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category_id UUID REFERENCES public.categories(id),
  vendor_id UUID REFERENCES public.user_profiles(id),
  brand TEXT,
  model TEXT,
  year INTEGER,
  condition TEXT DEFAULT 'new',
  availability_status TEXT DEFAULT 'available',
  featured BOOLEAN DEFAULT FALSE,
  images TEXT[],
  specifications JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create guest carts table
CREATE TABLE IF NOT EXISTS public.guest_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create guest cart items table
CREATE TABLE IF NOT EXISTS public.guest_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_cart_id UUID REFERENCES public.guest_carts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user carts table
CREATE TABLE IF NOT EXISTS public.carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create cart items table
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(cart_id, product_id)
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id),
  order_number TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'pending',
  payment_intent_id TEXT,
  stripe_session_id TEXT,
  total_amount DECIMAL(10,2) NOT NULL,
  shipping_address JSONB,
  billing_address JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create order items table
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quotes table
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id),
  quote_number TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending',
  total_amount DECIMAL(10,2),
  valid_until TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create quote items table
CREATE TABLE IF NOT EXISTS public.quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create company partners table
CREATE TABLE IF NOT EXISTS public.company_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  active BOOLEAN DEFAULT TRUE,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS app_role AS $$
  SELECT role FROM public.user_profiles WHERE user_id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- RLS Policies for user_profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
CREATE POLICY "Admins can view all profiles" ON public.user_profiles
  FOR ALL USING (get_user_role(auth.uid()) IN ('admin', 'super_admin'));

-- RLS Policies for categories (public read)
DROP POLICY IF EXISTS "Anyone can view categories" ON public.categories;
CREATE POLICY "Anyone can view categories" ON public.categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories
  FOR ALL USING (get_user_role(auth.uid()) IN ('admin', 'super_admin'));

-- RLS Policies for products (public read)
DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
CREATE POLICY "Anyone can view products" ON public.products
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Vendors can manage their own products" ON public.products;
CREATE POLICY "Vendors can manage their own products" ON public.products
  FOR ALL USING (vendor_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all products" ON public.products;
CREATE POLICY "Admins can manage all products" ON public.products
  FOR ALL USING (get_user_role(auth.uid()) IN ('admin', 'super_admin'));

-- RLS Policies for guest carts (public access)
DROP POLICY IF EXISTS "Anyone can manage guest carts" ON public.guest_carts;
CREATE POLICY "Anyone can manage guest carts" ON public.guest_carts
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Anyone can manage guest cart items" ON public.guest_cart_items;
CREATE POLICY "Anyone can manage guest cart items" ON public.guest_cart_items
  FOR ALL USING (true);

-- RLS Policies for user carts
DROP POLICY IF EXISTS "Users can manage their own cart" ON public.carts;
CREATE POLICY "Users can manage their own cart" ON public.carts
  FOR ALL USING (user_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage their own cart items" ON public.cart_items;
CREATE POLICY "Users can manage their own cart items" ON public.cart_items
  FOR ALL USING (cart_id IN (SELECT id FROM public.carts WHERE user_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())));

-- RLS Policies for orders
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (user_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create orders" ON public.orders;
CREATE POLICY "Users can create orders" ON public.orders
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
CREATE POLICY "Admins can view all orders" ON public.orders
  FOR ALL USING (get_user_role(auth.uid()) IN ('admin', 'super_admin'));

-- RLS Policies for order items
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
CREATE POLICY "Users can view their own order items" ON public.order_items
  FOR SELECT USING (order_id IN (SELECT id FROM public.orders WHERE user_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())));

DROP POLICY IF EXISTS "Order items can be created with orders" ON public.order_items;
CREATE POLICY "Order items can be created with orders" ON public.order_items
  FOR INSERT WITH CHECK (true);

-- RLS Policies for quotes
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;
CREATE POLICY "Users can view their own quotes" ON public.quotes
  FOR SELECT USING (user_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create quotes" ON public.quotes;
CREATE POLICY "Users can create quotes" ON public.quotes
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all quotes" ON public.quotes;
CREATE POLICY "Admins can manage all quotes" ON public.quotes
  FOR ALL USING (get_user_role(auth.uid()) IN ('admin', 'super_admin'));

-- RLS Policies for quote items
DROP POLICY IF EXISTS "Users can view their own quote items" ON public.quote_items;
CREATE POLICY "Users can view their own quote items" ON public.quote_items
  FOR SELECT USING (quote_id IN (SELECT id FROM public.quotes WHERE user_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())));

DROP POLICY IF EXISTS "Quote items can be created with quotes" ON public.quote_items;
CREATE POLICY "Quote items can be created with quotes" ON public.quote_items
  FOR INSERT WITH CHECK (true);

-- RLS Policies for company partners (public read)
DROP POLICY IF EXISTS "Anyone can view company partners" ON public.company_partners;
CREATE POLICY "Anyone can view company partners" ON public.company_partners
  FOR SELECT USING (active = true);

DROP POLICY IF EXISTS "Admins can manage company partners" ON public.company_partners;
CREATE POLICY "Admins can manage company partners" ON public.company_partners
  FOR ALL USING (get_user_role(auth.uid()) IN ('admin', 'super_admin'));

-- RLS Policies for notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Admins can create notifications" ON public.notifications;
CREATE POLICY "Admins can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (get_user_role(auth.uid()) IN ('admin', 'super_admin'));

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample data
INSERT INTO public.categories (name, description, image_url) VALUES
('Tractors', 'Agricultural tractors and farming vehicles', '/src/assets/Newtractor.png'),
('Harvesters', 'Combine harvesters and harvesting equipment', '/src/assets/Harverster.jpg'),
('Ploughs', 'Ploughing and soil preparation equipment', '/src/assets/Plough.png'),
('Irrigation', 'Sprinkler systems and irrigation equipment', '/src/assets/Sprinklers.png');

INSERT INTO public.company_partners (name, logo_url, website_url, display_order) VALUES
('John Deere', 'https://logos-world.net/wp-content/uploads/2020/04/John-Deere-Logo.png', 'https://www.deere.com', 1),
('Case IH', 'https://logos-world.net/wp-content/uploads/2020/04/Case-IH-Logo.png', 'https://www.caseih.com', 2),
('New Holland', 'https://logos-world.net/wp-content/uploads/2020/04/New-Holland-Logo.png', 'https://www.newholland.com', 3),
('Massey Ferguson', 'https://1000logos.net/wp-content/uploads/2020/09/Massey-Ferguson-Logo.png', 'https://www.masseyferguson.com', 4),
('Kubota', 'https://logos-world.net/wp-content/uploads/2020/04/Kubota-Logo.png', 'https://www.kubota.com', 5);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_guest_carts_updated_at BEFORE UPDATE ON public.guest_carts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_carts_updated_at BEFORE UPDATE ON public.carts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();