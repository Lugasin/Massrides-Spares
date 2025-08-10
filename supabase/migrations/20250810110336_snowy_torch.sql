/*
  # Agricultural Spare Parts Complete Database Schema

  1. New Tables
    - `spare_part_categories` - Categories for spare parts (engine, hydraulic, electrical, etc.)
    - `spare_parts` - Main spare parts inventory with detailed specifications
    - `equipment_compatibility` - Equipment compatibility matrix
    - `inventory_tracking` - Stock levels and warehouse management
    - `suppliers` - Supplier management
    - `supplier_parts` - Supplier pricing and availability
    - `user_carts` - User shopping carts
    - `cart_items` - Cart items with spare parts
    - `orders` - Order management
    - `order_items` - Order line items
    - `quotes` - Quote requests and management
    - `quote_items` - Quote line items
    - `messages` - In-app messaging system
    - `notifications` - Real-time notifications
    - `payment_intents` - Payment tracking
    - `email_verifications` - Email verification tracking

  2. Security
    - Enable RLS on all tables
    - RBAC policies for different user roles
    - Real-time subscriptions for live updates

  3. Functions
    - User registration handling
    - Email verification
    - Real-time notifications
    - Cart management
    - Order processing
*/

-- Create enum types
CREATE TYPE public.user_role AS ENUM ('super_admin', 'admin', 'vendor', 'customer', 'guest');
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');
CREATE TYPE public.payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'partially_refunded');
CREATE TYPE public.part_condition AS ENUM ('new', 'used', 'refurbished', 'oem', 'aftermarket');
CREATE TYPE public.availability_status AS ENUM ('in_stock', 'out_of_stock', 'on_order', 'discontinued');

-- User profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  company_name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'Zambia',
  role user_role DEFAULT 'customer',
  avatar_url TEXT,
  bio TEXT,
  website_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Spare part categories
CREATE TABLE IF NOT EXISTS public.spare_part_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_category_id UUID REFERENCES public.spare_part_categories(id),
  image_url TEXT,
  icon_name TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Equipment types for compatibility
CREATE TABLE IF NOT EXISTS public.equipment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  year_from INTEGER,
  year_to INTEGER,
  engine_type TEXT,
  horsepower_range TEXT,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Main spare parts table
CREATE TABLE IF NOT EXISTS public.spare_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES public.spare_part_categories(id),
  vendor_id UUID REFERENCES public.user_profiles(id),
  brand TEXT,
  oem_part_number TEXT,
  aftermarket_part_number TEXT,
  price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2),
  weight_kg DECIMAL(8,3),
  dimensions_cm TEXT,
  material TEXT,
  warranty_months INTEGER DEFAULT 12,
  condition part_condition DEFAULT 'new',
  availability_status availability_status DEFAULT 'in_stock',
  stock_quantity INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 5,
  max_stock_level INTEGER DEFAULT 100,
  location_in_warehouse TEXT,
  images TEXT[],
  technical_specs JSONB,
  installation_notes TEXT,
  featured BOOLEAN DEFAULT false,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Equipment compatibility matrix
CREATE TABLE IF NOT EXISTS public.equipment_compatibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spare_part_id UUID REFERENCES public.spare_parts(id) ON DELETE CASCADE,
  equipment_type_id UUID REFERENCES public.equipment_types(id) ON DELETE CASCADE,
  is_direct_fit BOOLEAN DEFAULT true,
  requires_modification BOOLEAN DEFAULT false,
  compatibility_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(spare_part_id, equipment_type_id)
);

-- Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'Zambia',
  payment_terms TEXT,
  lead_time_days INTEGER DEFAULT 7,
  minimum_order_amount DECIMAL(10,2),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User carts
CREATE TABLE IF NOT EXISTS public.user_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Cart items
CREATE TABLE IF NOT EXISTS public.cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID REFERENCES public.user_carts(id) ON DELETE CASCADE,
  spare_part_id UUID REFERENCES public.spare_parts(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(cart_id, spare_part_id)
);

-- Guest carts
CREATE TABLE IF NOT EXISTS public.guest_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Guest cart items
CREATE TABLE IF NOT EXISTS public.guest_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_cart_id UUID REFERENCES public.guest_carts(id) ON DELETE CASCADE,
  spare_part_id UUID REFERENCES public.spare_parts(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id),
  order_number TEXT UNIQUE NOT NULL,
  status order_status DEFAULT 'pending',
  payment_status payment_status DEFAULT 'pending',
  payment_intent_id TEXT,
  total_amount DECIMAL(10,2) NOT NULL,
  shipping_address JSONB,
  billing_address JSONB,
  delivery_method TEXT DEFAULT 'standard',
  urgency_level TEXT DEFAULT 'standard',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Order items
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  spare_part_id UUID REFERENCES public.spare_parts(id),
  part_number TEXT,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  warranty_months INTEGER DEFAULT 12,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Quotes
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number TEXT UNIQUE NOT NULL,
  client_id UUID REFERENCES public.user_profiles(id),
  vendor_id UUID REFERENCES public.user_profiles(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'accepted', 'rejected', 'revised', 'cancelled')),
  total_amount DECIMAL(10,2) DEFAULT 0,
  valid_until TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Quote items
CREATE TABLE IF NOT EXISTS public.quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  spare_part_id UUID REFERENCES public.spare_parts(id),
  part_number TEXT,
  part_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Messages for in-app communication
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL,
  sender_id UUID REFERENCES public.user_profiles(id),
  recipient_id UUID REFERENCES public.user_profiles(id),
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1_id UUID REFERENCES public.user_profiles(id),
  participant_2_id UUID REFERENCES public.user_profiles(id),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(participant_1_id, participant_2_id)
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Email verifications
CREATE TABLE IF NOT EXISTS public.email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id),
  email TEXT NOT NULL,
  token TEXT NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Payment intents
CREATE TABLE IF NOT EXISTS public.payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id),
  stripe_payment_intent_id TEXT,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT DEFAULT 'pending',
  user_id UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Company partners
CREATE TABLE IF NOT EXISTS public.company_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  website_url TEXT,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Permissions system
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Role permissions
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role user_role NOT NULL,
  permission_id UUID REFERENCES public.permissions(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  PRIMARY KEY (role, permission_id)
);

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spare_part_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_compatibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS user_role AS $$
  SELECT role FROM public.user_profiles WHERE user_id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = '';

-- RLS Policies

-- User profiles
CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles" ON public.user_profiles
  FOR ALL USING (get_user_role(auth.uid()) IN ('admin', 'super_admin'));

-- Spare part categories (public read)
CREATE POLICY "Anyone can view categories" ON public.spare_part_categories
  FOR SELECT USING (active = true);

CREATE POLICY "Admins can manage categories" ON public.spare_part_categories
  FOR ALL USING (get_user_role(auth.uid()) IN ('admin', 'super_admin'));

-- Equipment types (public read)
CREATE POLICY "Anyone can view equipment types" ON public.equipment_types
  FOR SELECT USING (true);

CREATE POLICY "Vendors can manage equipment types" ON public.equipment_types
  FOR ALL USING (get_user_role(auth.uid()) IN ('vendor', 'admin', 'super_admin'));

-- Spare parts (public read, vendor manage)
CREATE POLICY "Anyone can view spare parts" ON public.spare_parts
  FOR SELECT USING (true);

CREATE POLICY "Vendors can manage their spare parts" ON public.spare_parts
  FOR ALL USING (
    vendor_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()) OR
    get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

-- Equipment compatibility (public read)
CREATE POLICY "Anyone can view compatibility" ON public.equipment_compatibility
  FOR SELECT USING (true);

CREATE POLICY "Vendors can manage compatibility" ON public.equipment_compatibility
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.spare_parts sp 
      WHERE sp.id = spare_part_id AND sp.vendor_id IN (
        SELECT id FROM public.user_profiles WHERE user_id = auth.uid()
      )
    ) OR
    get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

-- User carts
CREATE POLICY "Users can manage their cart" ON public.user_carts
  FOR ALL USING (user_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

-- Cart items
CREATE POLICY "Users can manage their cart items" ON public.cart_items
  FOR ALL USING (
    cart_id IN (
      SELECT id FROM public.user_carts 
      WHERE user_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
    )
  );

-- Guest carts (public access)
CREATE POLICY "Anyone can manage guest carts" ON public.guest_carts
  FOR ALL USING (true);

CREATE POLICY "Anyone can manage guest cart items" ON public.guest_cart_items
  FOR ALL USING (true);

-- Orders
CREATE POLICY "Users can view their orders" ON public.orders
  FOR SELECT USING (
    user_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()) OR
    get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "Users can create orders" ON public.orders
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

-- Order items
CREATE POLICY "Users can view their order items" ON public.order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM public.orders 
      WHERE user_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
    ) OR
    get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

-- Quotes
CREATE POLICY "Users can view relevant quotes" ON public.quotes
  FOR SELECT USING (
    client_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()) OR
    vendor_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()) OR
    get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

CREATE POLICY "Vendors can manage quotes" ON public.quotes
  FOR ALL USING (
    vendor_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()) OR
    get_user_role(auth.uid()) IN ('admin', 'super_admin')
  );

-- Messages
CREATE POLICY "Users can view their messages" ON public.messages
  FOR SELECT USING (
    sender_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()) OR
    recipient_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (sender_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

-- Conversations
CREATE POLICY "Users can view their conversations" ON public.conversations
  FOR SELECT USING (
    participant_1_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()) OR
    participant_2_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid())
  );

-- Notifications
CREATE POLICY "Users can view their notifications" ON public.notifications
  FOR SELECT USING (user_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users can update their notifications" ON public.notifications
  FOR UPDATE USING (user_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()));

-- Company partners (public read)
CREATE POLICY "Anyone can view active partners" ON public.company_partners
  FOR SELECT USING (active = true);

-- Functions

-- Handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (
    user_id,
    email,
    full_name,
    phone,
    company_name,
    role
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', ''),
    'customer'
  );

  -- Create user cart
  INSERT INTO public.user_carts (user_id) 
  SELECT id FROM public.user_profiles WHERE user_id = NEW.id;

  -- Send welcome notification
  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT 
    id,
    'Welcome to Massrides Spare Parts!',
    'Your account has been created. Start browsing our extensive spare parts catalog.',
    'welcome'
  FROM public.user_profiles WHERE user_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Handle email verification
CREATE OR REPLACE FUNCTION public.handle_email_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.user_profiles 
    SET 
      is_verified = true,
      email_verified_at = NEW.email_confirmed_at
    WHERE user_id = NEW.id;

    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT 
      id,
      'Email Verified Successfully!',
      'Your email has been verified. You now have full access to all features.',
      'success'
    FROM public.user_profiles WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_email_verified
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_email_verification();

-- Updated at triggers
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON public.user_profiles 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_spare_parts_updated_at 
  BEFORE UPDATE ON public.spare_parts 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
  BEFORE UPDATE ON public.orders 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at 
  BEFORE UPDATE ON public.quotes 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data

-- Spare part categories
INSERT INTO public.spare_part_categories (name, description, icon_name, sort_order) VALUES
('Engine Parts', 'Engine components, filters, belts, and engine accessories', 'engine', 1),
('Hydraulic Parts', 'Hydraulic pumps, cylinders, hoses, and fittings', 'wrench', 2),
('Electrical Parts', 'Wiring, sensors, switches, and electrical components', 'zap', 3),
('Transmission Parts', 'Gearbox components, clutches, and drive parts', 'settings', 4),
('Cooling System', 'Radiators, thermostats, water pumps, and cooling components', 'thermometer', 5),
('Fuel System', 'Fuel pumps, injectors, tanks, and fuel line components', 'fuel', 6),
('Brake Parts', 'Brake pads, discs, hydraulic brake components', 'disc', 7),
('Steering Parts', 'Steering wheels, columns, and steering system components', 'steering-wheel', 8),
('Cabin Parts', 'Seats, glass, interior components, and cabin accessories', 'home', 9),
('Implements', 'Plow parts, cultivator components, and implement accessories', 'tool', 10);

-- Equipment types
INSERT INTO public.equipment_types (name, brand, description) VALUES
('John Deere 6M Series', 'John Deere', 'Mid-range utility tractors 110-170 HP'),
('John Deere 7R Series', 'John Deere', 'Row crop tractors 210-370 HP'),
('Case IH Magnum Series', 'Case IH', 'High-horsepower tractors 280-380 HP'),
('New Holland T7 Series', 'New Holland', 'Versatile tractors 165-315 HP'),
('Massey Ferguson 6700 Series', 'Massey Ferguson', 'Global series tractors 145-240 HP'),
('Kubota M Series', 'Kubota', 'Utility tractors 85-170 HP');

-- Company partners
INSERT INTO public.company_partners (name, logo_url, website_url, description, display_order) VALUES
('John Deere', 'https://logos-world.net/wp-content/uploads/2020/04/John-Deere-Logo.png', 'https://www.deere.com', 'Leading manufacturer of agricultural machinery', 1),
('Case IH', 'https://logos-world.net/wp-content/uploads/2020/04/Case-IH-Logo.png', 'https://www.caseih.com', 'Global leader in agricultural equipment', 2),
('New Holland', 'https://logos-world.net/wp-content/uploads/2020/04/New-Holland-Logo.png', 'https://www.newholland.com', 'Agricultural and construction equipment', 3),
('Kubota', 'https://logos-world.net/wp-content/uploads/2020/04/Kubota-Logo.png', 'https://www.kubota.com', 'Compact and utility tractor specialist', 4),
('Massey Ferguson', 'https://1000logos.net/wp-content/uploads/2020/09/Massey-Ferguson-Logo.png', 'https://www.masseyferguson.com', 'Global agricultural equipment brand', 5);

-- Permissions
INSERT INTO public.permissions (name, description) VALUES
('manage_spare_parts', 'Can create, edit, and delete spare parts'),
('manage_orders', 'Can view and manage all orders'),
('manage_users', 'Can manage user accounts and roles'),
('view_analytics', 'Can view system analytics and reports'),
('manage_system', 'Can perform system maintenance and configuration'),
('send_messages', 'Can send messages to other users'),
('manage_quotes', 'Can create and manage quotes');

-- Role permissions
INSERT INTO public.role_permissions (role, permission_id) VALUES
('vendor', (SELECT id FROM public.permissions WHERE name = 'manage_spare_parts')),
('vendor', (SELECT id FROM public.permissions WHERE name = 'send_messages')),
('vendor', (SELECT id FROM public.permissions WHERE name = 'manage_quotes')),
('admin', (SELECT id FROM public.permissions WHERE name = 'manage_spare_parts')),
('admin', (SELECT id FROM public.permissions WHERE name = 'manage_orders')),
('admin', (SELECT id FROM public.permissions WHERE name = 'manage_users')),
('admin', (SELECT id FROM public.permissions WHERE name = 'view_analytics')),
('admin', (SELECT id FROM public.permissions WHERE name = 'send_messages')),
('admin', (SELECT id FROM public.permissions WHERE name = 'manage_quotes')),
('super_admin', (SELECT id FROM public.permissions WHERE name = 'manage_spare_parts')),
('super_admin', (SELECT id FROM public.permissions WHERE name = 'manage_orders')),
('super_admin', (SELECT id FROM public.permissions WHERE name = 'manage_users')),
('super_admin', (SELECT id FROM public.permissions WHERE name = 'view_analytics')),
('super_admin', (SELECT id FROM public.permissions WHERE name = 'manage_system')),
('super_admin', (SELECT id FROM public.permissions WHERE name = 'send_messages')),
('super_admin', (SELECT id FROM public.permissions WHERE name = 'manage_quotes'));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_spare_parts_category ON public.spare_parts(category_id);
CREATE INDEX IF NOT EXISTS idx_spare_parts_vendor ON public.spare_parts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_spare_parts_part_number ON public.spare_parts(part_number);
CREATE INDEX IF NOT EXISTS idx_spare_parts_brand ON public.spare_parts(brand);
CREATE INDEX IF NOT EXISTS idx_equipment_compatibility_part ON public.equipment_compatibility(spare_part_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cart_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quotes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;