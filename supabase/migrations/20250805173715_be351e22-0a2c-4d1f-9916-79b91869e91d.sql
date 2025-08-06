-- STEP 1: Ensure the public schema exists
CREATE SCHEMA IF NOT EXISTS public;

-- STEP 2: Create user_profiles table FIRST (used by others)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  company_name TEXT,
  address TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('guest', 'customer', 'vendor', 'admin', 'super_admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  UNIQUE(user_id)
);

-- STEP 3: Create other core tables
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  category_id UUID,
  vendor_id UUID,
  brand TEXT,
  model TEXT,
  year INTEGER,
  images TEXT[],
  specifications JSONB,
  condition TEXT DEFAULT 'new',
  availability_status TEXT DEFAULT 'available',
  featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  shipping_address JSONB,
  billing_address JSONB,
  notes TEXT,
  order_number TEXT,
  payment_status TEXT DEFAULT 'pending',
  payment_intent_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL,
  vendor_id UUID NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'accepted', 'rejected', 'revised', 'cancelled')),
  total_amount NUMERIC DEFAULT 0,
  notes TEXT,
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.company_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  website_url TEXT,
  active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now())
);


-- STEP 4: RLS
-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_partners ENABLE ROW LEVEL SECURITY;

-- Policies for company_partners
CREATE POLICY "Public can view active partners" ON public.company_partners
  FOR SELECT USING (active = true);

CREATE POLICY "Admins can manage partners" ON public.company_partners
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.user_id = auth.uid() AND up.role IN ('admin', 'super_admin')
    )
);

-- Policies for user_profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Policies for cart_items
CREATE POLICY "Users can manage their own cart items" ON public.cart_items
  FOR ALL USING (user_id = auth.uid());

-- Policies for quotes
CREATE POLICY "Users can view their own quotes" ON public.quotes
  FOR SELECT USING (
    client_id = auth.uid() OR 
    vendor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.user_id = auth.uid() AND up.role IN ('admin', 'super_admin')
    )
);

CREATE POLICY "Vendors can create quotes" ON public.quotes
  FOR INSERT WITH CHECK (
    vendor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.user_id = auth.uid() AND up.role IN ('admin', 'super_admin')
    )
);

CREATE POLICY "Vendors and clients can update quotes" ON public.quotes
  FOR UPDATE USING (
    client_id = auth.uid() OR 
    vendor_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up 
      WHERE up.user_id = auth.uid() AND up.role IN ('admin', 'super_admin')
    )
);

-- Policies for quote_items
CREATE POLICY "Users can view quote items for their quotes" ON public.quote_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quotes q 
      WHERE q.id = quote_id AND (
        q.client_id = auth.uid() OR 
        q.vendor_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.user_profiles up 
          WHERE up.user_id = auth.uid() AND up.role IN ('admin', 'super_admin')
        )
      )
    )
);

CREATE POLICY "Vendors can manage quote items" ON public.quote_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.quotes q 
      WHERE q.id = quote_id AND (
        q.vendor_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.user_profiles up 
          WHERE up.user_id = auth.uid() AND up.role IN ('admin', 'super_admin')
        )
      )
    )
);

-- STEP 5: Realtime table publications
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quote_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cart_items;

-- STEP 6: Handle user signup (trigger + function)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- STEP 7: Insert sample data for company_partners
INSERT INTO public.company_partners (name, logo_url, website_url, display_order)
VALUES
  ('John Deere', '/api/placeholder/120/60', 'https://johndeere.com', 1),
  ('Case IH', '/api/placeholder/120/60', 'https://caseih.com', 2),
  ('New Holland', '/api/placeholder/120/60', 'https://newholland.com', 3),
  ('Kubota', '/api/placeholder/120/60', 'https://kubota.com', 4),
  ('Massey Ferguson', '/api/placeholder/120/60', 'https://masseyferguson.com', 5)
ON CONFLICT (name) DO NOTHING;

-- STEP 8: Optional fix: populate missing order_numbers
UPDATE public.orders
SET order_number = 'ORD-' || id
WHERE order_number IS NULL;
