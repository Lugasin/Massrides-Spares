/*
  # Complete Massrides Agricultural Spare Parts Schema

  1. New Tables
    - `user_profiles` - User profile information with roles
    - `spare_part_categories` - Categories for spare parts
    - `spare_parts` - Main spare parts catalog
    - `equipment_types` - Equipment compatibility data
    - `equipment_compatibility` - Parts to equipment mapping
    - `user_carts` - User shopping carts
    - `guest_carts` - Guest shopping carts
    - `cart_items` - User cart items
    - `guest_cart_items` - Guest cart items
    - `orders` - Order management
    - `order_items` - Order line items
    - `quotes` - Quote requests
    - `quote_items` - Quote line items
    - `conversations` - Messaging system
    - `messages` - Individual messages
    - `notifications` - Real-time notifications
    - `payment_sessions` - TJ payment tracking
    - `company_partners` - Partner companies

  2. Security
    - Enable RLS on all tables
    - Add comprehensive policies for each role
    - Secure guest access patterns

  3. Functions
    - User profile creation trigger
    - Notification helpers
    - Cart management functions
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Profiles with comprehensive role system
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  phone text,
  address text,
  city text,
  state text,
  zip_code text,
  country text DEFAULT 'Zambia',
  company_name text,
  role text DEFAULT 'customer' CHECK (role IN ('super_admin', 'admin', 'vendor', 'customer', 'guest')),
  website_url text,
  avatar_url text,
  bio text,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(email)
);

-- Spare Part Categories
CREATE TABLE IF NOT EXISTS spare_part_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  image_url text,
  display_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Equipment Types for compatibility
CREATE TABLE IF NOT EXISTS equipment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text NOT NULL,
  model text,
  year_from integer,
  year_to integer,
  engine_type text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(name, brand, model)
);

-- Main Spare Parts table
CREATE TABLE IF NOT EXISTS spare_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  category_id uuid REFERENCES spare_part_categories(id) ON DELETE SET NULL,
  part_number text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  brand text NOT NULL,
  oem_part_number text,
  aftermarket_part_number text,
  price decimal(10,2) NOT NULL CHECK (price >= 0),
  condition text DEFAULT 'new' CHECK (condition IN ('new', 'used', 'refurbished', 'oem', 'aftermarket')),
  availability_status text DEFAULT 'in_stock' CHECK (availability_status IN ('in_stock', 'out_of_stock', 'on_order', 'discontinued')),
  stock_quantity integer DEFAULT 0 CHECK (stock_quantity >= 0),
  min_stock_level integer DEFAULT 5,
  images text[] DEFAULT '{}',
  technical_specs jsonb DEFAULT '{}',
  warranty_months integer DEFAULT 12,
  weight_kg decimal(8,2),
  dimensions_cm text,
  featured boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Equipment Compatibility mapping
CREATE TABLE IF NOT EXISTS equipment_compatibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spare_part_id uuid REFERENCES spare_parts(id) ON DELETE CASCADE,
  equipment_type_id uuid REFERENCES equipment_types(id) ON DELETE CASCADE,
  is_direct_fit boolean DEFAULT true,
  compatibility_notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(spare_part_id, equipment_type_id)
);

-- User Carts
CREATE TABLE IF NOT EXISTS user_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Guest Carts
CREATE TABLE IF NOT EXISTS guest_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

-- User Cart Items
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid REFERENCES user_carts(id) ON DELETE CASCADE,
  spare_part_id uuid REFERENCES spare_parts(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(cart_id, spare_part_id)
);

-- Guest Cart Items
CREATE TABLE IF NOT EXISTS guest_cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_cart_id uuid REFERENCES guest_carts(id) ON DELETE CASCADE,
  spare_part_id uuid REFERENCES spare_parts(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(guest_cart_id, spare_part_id)
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  order_number text NOT NULL UNIQUE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'failed')),
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
  total_amount decimal(10,2) NOT NULL CHECK (total_amount >= 0),
  shipping_address jsonb,
  billing_address jsonb,
  payment_intent_id text,
  tj_session_id text,
  notes text,
  guest_session_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  spare_part_id uuid REFERENCES spare_parts(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  price decimal(10,2) NOT NULL CHECK (price >= 0),
  created_at timestamptz DEFAULT now()
);

-- Quotes
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  quote_number text NOT NULL UNIQUE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'accepted', 'rejected', 'revised', 'cancelled')),
  total_amount decimal(10,2) DEFAULT 0,
  valid_until timestamptz DEFAULT (now() + interval '30 days'),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Quote Items
CREATE TABLE IF NOT EXISTS quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE,
  spare_part_id uuid REFERENCES spare_parts(id) ON DELETE RESTRICT,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price decimal(10,2) NOT NULL CHECK (price >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Conversations for messaging
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  participant_2_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(participant_1_id, participant_2_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'welcome', 'order', 'payment', 'message')),
  read boolean DEFAULT false,
  action_url text,
  created_at timestamptz DEFAULT now()
);

-- Payment Sessions for TJ integration
CREATE TABLE IF NOT EXISTS payment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  tj_session_id text NOT NULL UNIQUE,
  amount decimal(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  customer_email text NOT NULL,
  merchant_ref text NOT NULL,
  webhook_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Company Partners
CREATE TABLE IF NOT EXISTS company_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  website_url text,
  description text,
  display_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE spare_part_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_compatibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_partners ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
CREATE POLICY "Users can view all profiles" ON user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage all profiles" ON user_profiles FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Spare Part Categories Policies
CREATE POLICY "Anyone can view categories" ON spare_part_categories FOR SELECT USING (active = true);
CREATE POLICY "Admins can manage categories" ON spare_part_categories FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Equipment Types Policies
CREATE POLICY "Anyone can view equipment types" ON equipment_types FOR SELECT USING (true);
CREATE POLICY "Admins can manage equipment types" ON equipment_types FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Spare Parts Policies
CREATE POLICY "Anyone can view spare parts" ON spare_parts FOR SELECT USING (true);
CREATE POLICY "Vendors can manage own parts" ON spare_parts FOR ALL USING (
  vendor_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  )
);
CREATE POLICY "Admins can manage all parts" ON spare_parts FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Equipment Compatibility Policies
CREATE POLICY "Anyone can view compatibility" ON equipment_compatibility FOR SELECT USING (true);
CREATE POLICY "Vendors can manage compatibility for own parts" ON equipment_compatibility FOR ALL USING (
  spare_part_id IN (
    SELECT sp.id FROM spare_parts sp
    JOIN user_profiles up ON sp.vendor_id = up.id
    WHERE up.user_id = auth.uid()
  )
);

-- User Carts Policies
CREATE POLICY "Users can manage own cart" ON user_carts FOR ALL USING (
  user_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- Guest Carts Policies (no RLS restrictions for guests)
CREATE POLICY "Anyone can manage guest carts" ON guest_carts FOR ALL USING (true);

-- Cart Items Policies
CREATE POLICY "Users can manage own cart items" ON cart_items FOR ALL USING (
  cart_id IN (
    SELECT uc.id FROM user_carts uc
    JOIN user_profiles up ON uc.user_id = up.id
    WHERE up.user_id = auth.uid()
  )
);

-- Guest Cart Items Policies
CREATE POLICY "Anyone can manage guest cart items" ON guest_cart_items FOR ALL USING (true);

-- Orders Policies
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (
  user_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  ) OR user_id IS NULL
);
CREATE POLICY "Users can create orders" ON orders FOR INSERT WITH CHECK (
  user_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  ) OR user_id IS NULL
);
CREATE POLICY "Admins can manage all orders" ON orders FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Order Items Policies
CREATE POLICY "Users can view own order items" ON order_items FOR SELECT USING (
  order_id IN (
    SELECT id FROM orders 
    WHERE user_id IN (
      SELECT id FROM user_profiles WHERE user_id = auth.uid()
    ) OR user_id IS NULL
  )
);
CREATE POLICY "System can create order items" ON order_items FOR INSERT WITH CHECK (true);

-- Quotes Policies
CREATE POLICY "Users can view own quotes" ON quotes FOR SELECT USING (
  client_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  ) OR vendor_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  )
);
CREATE POLICY "Customers can create quotes" ON quotes FOR INSERT WITH CHECK (
  client_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  )
);
CREATE POLICY "Vendors can update quotes" ON quotes FOR UPDATE USING (
  vendor_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- Quote Items Policies
CREATE POLICY "Users can view quote items" ON quote_items FOR SELECT USING (
  quote_id IN (
    SELECT id FROM quotes 
    WHERE client_id IN (
      SELECT id FROM user_profiles WHERE user_id = auth.uid()
    ) OR vendor_id IN (
      SELECT id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
);
CREATE POLICY "System can manage quote items" ON quote_items FOR ALL WITH CHECK (true);

-- Conversations Policies
CREATE POLICY "Users can view own conversations" ON conversations FOR SELECT USING (
  participant_1_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  ) OR participant_2_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  )
);
CREATE POLICY "Users can create conversations" ON conversations FOR INSERT WITH CHECK (
  participant_1_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  ) OR participant_2_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- Messages Policies
CREATE POLICY "Users can view own messages" ON messages FOR SELECT USING (
  sender_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  ) OR recipient_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  )
);
CREATE POLICY "Users can send messages" ON messages FOR INSERT WITH CHECK (
  sender_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  )
);
CREATE POLICY "Users can update own messages" ON messages FOR UPDATE USING (
  sender_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  ) OR recipient_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  )
);

-- Notifications Policies
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (
  user_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  )
);
CREATE POLICY "Users can update own notifications" ON notifications FOR UPDATE USING (
  user_id IN (
    SELECT id FROM user_profiles WHERE user_id = auth.uid()
  )
);
CREATE POLICY "System can create notifications" ON notifications FOR INSERT WITH CHECK (true);

-- Payment Sessions Policies
CREATE POLICY "Users can view own payment sessions" ON payment_sessions FOR SELECT USING (
  order_id IN (
    SELECT id FROM orders 
    WHERE user_id IN (
      SELECT id FROM user_profiles WHERE user_id = auth.uid()
    )
  )
);
CREATE POLICY "System can manage payment sessions" ON payment_sessions FOR ALL WITH CHECK (true);

-- Company Partners Policies
CREATE POLICY "Anyone can view active partners" ON company_partners FOR SELECT USING (active = true);
CREATE POLICY "Admins can manage partners" ON company_partners FOR ALL USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Functions and Triggers

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (user_id, email, full_name, phone, company_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'company_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS create_user_profile_trigger ON auth.users;
CREATE TRIGGER create_user_profile_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_profile();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_spare_parts_updated_at
  BEFORE UPDATE ON spare_parts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_user_carts_updated_at
  BEFORE UPDATE ON user_carts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Insert initial data

-- Categories
INSERT INTO spare_part_categories (name, description, display_order) VALUES
('Engine Parts', 'Engine components including filters, gaskets, and internal parts', 1),
('Hydraulic Parts', 'Hydraulic system components including pumps, cylinders, and hoses', 2),
('Electrical Parts', 'Electrical components including alternators, starters, and wiring', 3),
('Transmission Parts', 'Transmission and drivetrain components', 4),
('Cooling System', 'Cooling system parts including radiators and thermostats', 5),
('Fuel System', 'Fuel system components including pumps and filters', 6),
('Brake Parts', 'Brake system components and safety parts', 7),
('Steering Parts', 'Steering system components and linkages', 8),
('Cabin Parts', 'Operator cabin components and comfort items', 9),
('Implements', 'Implement attachments and tillage tools', 10),
('Wheels & Tires', 'Tires, rims, and wheel components', 11)
ON CONFLICT (name) DO NOTHING;

-- Equipment Types
INSERT INTO equipment_types (name, brand, model, year_from, year_to) VALUES
('6M Series Tractor', 'John Deere', '6M', 2010, 2024),
('7R Series Tractor', 'John Deere', '7R', 2011, 2024),
('8R Series Tractor', 'John Deere', '8R', 2009, 2024),
('Magnum Series Tractor', 'Case IH', 'Magnum', 2008, 2024),
('Puma Series Tractor', 'Case IH', 'Puma', 2007, 2024),
('T7 Series Tractor', 'New Holland', 'T7', 2008, 2024),
('M Series Tractor', 'Kubota', 'M', 2005, 2024),
('Fendt 700 Series', 'Fendt', '700', 2012, 2024),
('MF 6400 Series', 'Massey Ferguson', '6400', 2004, 2020)
ON CONFLICT (name, brand, model) DO NOTHING;

-- Company Partners
INSERT INTO company_partners (name, logo_url, website_url, description, display_order) VALUES
('John Deere', 'https://logos-world.net/wp-content/uploads/2020/04/John-Deere-Logo.png', 'https://www.deere.com', 'Leading manufacturer of agricultural machinery', 1),
('Case IH', 'https://logos-world.net/wp-content/uploads/2020/04/Case-IH-Logo.png', 'https://www.caseih.com', 'Global leader in agricultural equipment', 2),
('New Holland', 'https://logos-world.net/wp-content/uploads/2020/04/New-Holland-Logo.png', 'https://www.newholland.com', 'Agricultural and construction equipment', 3),
('Kubota', 'https://logos-world.net/wp-content/uploads/2020/04/Kubota-Logo.png', 'https://www.kubota.com', 'Compact and utility tractor specialist', 4),
('Massey Ferguson', 'https://1000logos.net/wp-content/uploads/2020/09/Massey-Ferguson-Logo.png', 'https://www.masseyferguson.com', 'Global agricultural equipment brand', 5)
ON CONFLICT (name) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_spare_parts_category ON spare_parts(category_id);
CREATE INDEX IF NOT EXISTS idx_spare_parts_vendor ON spare_parts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_spare_parts_featured ON spare_parts(featured);
CREATE INDEX IF NOT EXISTS idx_spare_parts_availability ON spare_parts(availability_status);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_guest_cart_items_cart ON guest_cart_items(guest_cart_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);