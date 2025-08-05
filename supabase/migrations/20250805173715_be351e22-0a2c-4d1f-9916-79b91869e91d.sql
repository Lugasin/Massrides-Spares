-- Create missing tables for enhanced shopping experience

-- Create company_partners table for partner logos
CREATE TABLE IF NOT EXISTS public.company_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  website_url TEXT,
  active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Create user_profiles table for extended user information  
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  company_name TEXT,
  address TEXT,
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('guest', 'customer', 'vendor', 'admin', 'super_admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Create cart_items table for user carts
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Create quotes table
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL,
  vendor_id UUID NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'accepted', 'rejected', 'revised', 'cancelled')),
  total_amount NUMERIC DEFAULT 0,
  notes TEXT,
  valid_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create quote_items table
CREATE TABLE IF NOT EXISTS public.quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add missing columns to existing tables
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'new',
ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'available',
ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;

-- Add missing columns to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS order_number TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;

-- Update order_number for existing orders if null
UPDATE public.orders SET order_number = 'ORD-' || id WHERE order_number IS NULL;

-- Enable RLS on all tables
ALTER TABLE public.company_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for company_partners
CREATE POLICY "Public can view active partners" ON public.company_partners
FOR SELECT USING (active = true);

CREATE POLICY "Admins can manage partners" ON public.company_partners
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up 
    WHERE up.user_id = auth.uid() AND up.role IN ('admin', 'super_admin')
  )
);

-- Create RLS policies for user_profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile" ON public.user_profiles
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create RLS policies for cart_items
CREATE POLICY "Users can manage their own cart items" ON public.cart_items
FOR ALL USING (user_id = auth.uid());

-- Create RLS policies for quotes
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

-- Create RLS policies for quote_items
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

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    'customer'
  );
  RETURN new;
END;
$$;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Enable realtime for relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quote_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cart_items;

-- Insert some sample partner data
INSERT INTO public.company_partners (name, logo_url, website_url, display_order) VALUES
('John Deere', '/api/placeholder/120/60', 'https://johndeere.com', 1),
('Case IH', '/api/placeholder/120/60', 'https://caseih.com', 2),
('New Holland', '/api/placeholder/120/60', 'https://newholland.com', 3),
('Kubota', '/api/placeholder/120/60', 'https://kubota.com', 4),
('Massey Ferguson', '/api/placeholder/120/60', 'https://masseyferguson.com', 5)
ON CONFLICT (name) DO NOTHING;