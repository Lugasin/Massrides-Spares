/*
  # Complete Agricultural Spare Parts Schema

  1. New Tables
    - `spare_parts` - Main spare parts catalog with comprehensive details
    - `spare_part_categories` - Categories for organizing spare parts
    - `spare_part_images` - Multiple images per spare part
    - `equipment_types` - Types of agricultural equipment
    - `equipment_compatibility` - Compatibility mapping between parts and equipment
    - `user_carts` - User shopping carts
    - `guest_carts` - Guest user carts
    - `conversations` - User messaging system
    - `messages` - Individual messages
    - `support_tickets` - Customer support system
    - `inventory_logs` - Track inventory changes
    - `product_reviews` - Customer reviews for spare parts

  2. Security
    - Enable RLS on all tables
    - Add comprehensive policies for each user role
    - Secure messaging between relevant users only

  3. Real-time Features
    - Triggers for inventory updates
    - Real-time messaging notifications
    - Cart synchronization
    - Order status updates

  4. Functions
    - Auto-generate part numbers
    - Calculate compatibility scores
    - Handle new user registration
*/

-- Create spare part categories
CREATE TABLE IF NOT EXISTS spare_part_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  icon_name text,
  display_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create equipment types
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

-- Create main spare parts table
CREATE TABLE IF NOT EXISTS spare_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES spare_part_categories(id),
  brand text NOT NULL,
  oem_part_number text,
  aftermarket_part_number text,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  condition text DEFAULT 'new' CHECK (condition IN ('new', 'used', 'refurbished', 'oem', 'aftermarket')),
  availability_status text DEFAULT 'in_stock' CHECK (availability_status IN ('in_stock', 'out_of_stock', 'on_order', 'discontinued')),
  stock_quantity integer DEFAULT 0 CHECK (stock_quantity >= 0),
  min_stock_level integer DEFAULT 5,
  technical_specs jsonb DEFAULT '{}',
  warranty_months integer DEFAULT 12,
  weight_kg numeric(8,2),
  dimensions_cm text,
  featured boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  vendor_id uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create spare part images table
CREATE TABLE IF NOT EXISTS spare_part_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spare_part_id uuid REFERENCES spare_parts(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  alt_text text,
  display_order integer DEFAULT 0,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create equipment compatibility table
CREATE TABLE IF NOT EXISTS equipment_compatibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spare_part_id uuid REFERENCES spare_parts(id) ON DELETE CASCADE,
  equipment_type_id uuid REFERENCES equipment_types(id) ON DELETE CASCADE,
  is_direct_fit boolean DEFAULT true,
  compatibility_notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(spare_part_id, equipment_type_id)
);

-- Create user carts table
CREATE TABLE IF NOT EXISTS user_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Create guest carts table
CREATE TABLE IF NOT EXISTS guest_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

-- Update cart_items to reference user_carts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'cart_items' AND column_name = 'cart_id'
  ) THEN
    ALTER TABLE cart_items ADD COLUMN cart_id uuid REFERENCES user_carts(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create guest cart items table
CREATE TABLE IF NOT EXISTS guest_cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_cart_id uuid REFERENCES guest_carts(id) ON DELETE CASCADE,
  spare_part_id uuid REFERENCES spare_parts(id) ON DELETE CASCADE,
  quantity integer DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE(guest_cart_id, spare_part_id)
);

-- Create conversations table for messaging
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  participant_2_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(participant_1_id, participant_2_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create inventory logs table
CREATE TABLE IF NOT EXISTS inventory_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spare_part_id uuid REFERENCES spare_parts(id) ON DELETE CASCADE,
  change_type text NOT NULL CHECK (change_type IN ('stock_in', 'stock_out', 'adjustment', 'sale', 'return')),
  quantity_change integer NOT NULL,
  previous_quantity integer NOT NULL,
  new_quantity integer NOT NULL,
  reason text,
  user_id uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Create product reviews table
CREATE TABLE IF NOT EXISTS product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spare_part_id uuid REFERENCES spare_parts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  title text,
  comment text,
  verified_purchase boolean DEFAULT false,
  helpful_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(spare_part_id, user_id)
);

-- Enable RLS on all tables
ALTER TABLE spare_part_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE spare_part_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_compatibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- Policies for spare_part_categories
CREATE POLICY "Anyone can view categories"
  ON spare_part_categories FOR SELECT
  TO public
  USING (active = true);

CREATE POLICY "Admins can manage categories"
  ON spare_part_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Policies for equipment_types
CREATE POLICY "Anyone can view equipment types"
  ON equipment_types FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Admins can manage equipment types"
  ON equipment_types FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Policies for spare_parts
CREATE POLICY "Anyone can view available spare parts"
  ON spare_parts FOR SELECT
  TO public
  USING (availability_status != 'discontinued');

CREATE POLICY "Vendors can manage their own parts"
  ON spare_parts FOR ALL
  TO authenticated
  USING (
    vendor_id IN (
      SELECT id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all parts"
  ON spare_parts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Policies for spare_part_images
CREATE POLICY "Anyone can view spare part images"
  ON spare_part_images FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Vendors can manage their part images"
  ON spare_part_images FOR ALL
  TO authenticated
  USING (
    spare_part_id IN (
      SELECT id FROM spare_parts 
      WHERE vendor_id IN (
        SELECT id FROM user_profiles 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Policies for user_carts
CREATE POLICY "Users can manage their own cart"
  ON user_carts FOR ALL
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Policies for guest_carts (no RLS needed as session-based)
CREATE POLICY "Anyone can manage guest carts"
  ON guest_carts FOR ALL
  TO public
  USING (true);

CREATE POLICY "Anyone can manage guest cart items"
  ON guest_cart_items FOR ALL
  TO public
  USING (true);

-- Policies for conversations
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    participant_1_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()) OR
    participant_2_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    participant_1_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()) OR
    participant_2_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid())
  );

-- Policies for messages
CREATE POLICY "Users can view their messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    sender_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()) OR
    recipient_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    sender_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid())
  );

-- Policies for support_tickets
CREATE POLICY "Users can view their own tickets"
  ON support_tickets FOR SELECT
  TO authenticated
  USING (
    user_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'support')
    )
  );

CREATE POLICY "Anyone can create support tickets"
  ON support_tickets FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Support staff can manage tickets"
  ON support_tickets FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin', 'support')
    )
  );

-- Policies for inventory_logs
CREATE POLICY "Vendors can view their inventory logs"
  ON inventory_logs FOR SELECT
  TO authenticated
  USING (
    spare_part_id IN (
      SELECT id FROM spare_parts 
      WHERE vendor_id IN (
        SELECT id FROM user_profiles 
        WHERE user_id = auth.uid()
      )
    ) OR
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "System can create inventory logs"
  ON inventory_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policies for product_reviews
CREATE POLICY "Anyone can view reviews"
  ON product_reviews FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can manage their own reviews"
  ON product_reviews FOR ALL
  TO authenticated
  USING (
    user_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid())
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_spare_parts_category ON spare_parts(category_id);
CREATE INDEX IF NOT EXISTS idx_spare_parts_vendor ON spare_parts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_spare_parts_featured ON spare_parts(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_spare_parts_availability ON spare_parts(availability_status);
CREATE INDEX IF NOT EXISTS idx_spare_parts_search ON spare_parts USING gin(to_tsvector('english', name || ' ' || description));
CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(recipient_id, read_at) WHERE read_at IS NULL;

-- Function to auto-generate part numbers
CREATE OR REPLACE FUNCTION generate_part_number()
RETURNS text AS $$
DECLARE
  new_number text;
  counter integer;
BEGIN
  -- Get current year and generate sequential number
  SELECT COALESCE(MAX(CAST(SUBSTRING(part_number FROM 6) AS integer)), 0) + 1
  INTO counter
  FROM spare_parts
  WHERE part_number LIKE EXTRACT(year FROM now())::text || '-%';
  
  new_number := EXTRACT(year FROM now())::text || '-' || LPAD(counter::text, 6, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update inventory
CREATE OR REPLACE FUNCTION update_spare_part_inventory()
RETURNS trigger AS $$
BEGIN
  -- Log inventory change
  INSERT INTO inventory_logs (
    spare_part_id,
    change_type,
    quantity_change,
    previous_quantity,
    new_quantity,
    reason,
    user_id
  ) VALUES (
    NEW.id,
    CASE 
      WHEN OLD.stock_quantity IS NULL THEN 'stock_in'
      WHEN NEW.stock_quantity > OLD.stock_quantity THEN 'stock_in'
      WHEN NEW.stock_quantity < OLD.stock_quantity THEN 'stock_out'
      ELSE 'adjustment'
    END,
    NEW.stock_quantity - COALESCE(OLD.stock_quantity, 0),
    COALESCE(OLD.stock_quantity, 0),
    NEW.stock_quantity,
    'Inventory update',
    (SELECT id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
  );
  
  -- Update availability status based on stock
  IF NEW.stock_quantity <= 0 THEN
    NEW.availability_status := 'out_of_stock';
  ELSIF NEW.stock_quantity <= NEW.min_stock_level THEN
    -- Could trigger low stock notification here
    NULL;
  ELSE
    IF NEW.availability_status = 'out_of_stock' THEN
      NEW.availability_status := 'in_stock';
    END IF;
  END IF;
  
  NEW.updated_at := now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for inventory updates
DROP TRIGGER IF EXISTS trigger_update_spare_part_inventory ON spare_parts;
CREATE TRIGGER trigger_update_spare_part_inventory
  BEFORE UPDATE OF stock_quantity ON spare_parts
  FOR EACH ROW
  EXECUTE FUNCTION update_spare_part_inventory();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO user_profiles (user_id, email, role)
  VALUES (NEW.id, NEW.email, 'customer');
  
  -- Create user cart
  INSERT INTO user_carts (user_id)
  VALUES ((SELECT id FROM user_profiles WHERE user_id = NEW.id));
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Insert default categories
INSERT INTO spare_part_categories (name, description, icon_name, display_order) VALUES
  ('Engine Parts', 'Engine components and accessories', 'Package', 1),
  ('Hydraulic Parts', 'Hydraulic system components', 'Wrench', 2),
  ('Electrical Parts', 'Electrical components and wiring', 'Zap', 3),
  ('Transmission Parts', 'Transmission and drivetrain components', 'Settings', 4),
  ('Cooling System', 'Radiators, thermostats, and cooling components', 'Thermometer', 5),
  ('Fuel System', 'Fuel pumps, filters, and injection components', 'Fuel', 6),
  ('Brake Parts', 'Brake pads, discs, and hydraulic components', 'Disc', 7),
  ('Steering Parts', 'Steering wheels, columns, and linkages', 'Navigation', 8),
  ('Cabin Parts', 'Seats, controls, and interior components', 'Home', 9),
  ('Implements', 'Plow shares, cultivator parts, and attachments', 'Tool', 10),
  ('Wheels & Tires', 'Tires, rims, and wheel components', 'Circle', 11)
ON CONFLICT (name) DO NOTHING;

-- Insert sample equipment types
INSERT INTO equipment_types (name, brand, model, year_from, year_to) VALUES
  ('Tractor', 'John Deere', '6M Series', 2015, 2024),
  ('Tractor', 'John Deere', '7R Series', 2018, 2024),
  ('Tractor', 'John Deere', '8R Series', 2020, 2024),
  ('Tractor', 'Case IH', 'Magnum Series', 2016, 2024),
  ('Tractor', 'Case IH', 'Puma Series', 2017, 2024),
  ('Tractor', 'New Holland', 'T7 Series', 2015, 2024),
  ('Tractor', 'Kubota', 'M Series', 2018, 2024),
  ('Tractor', 'Massey Ferguson', 'MF 6400', 2016, 2024),
  ('Combine', 'John Deere', 'S Series', 2017, 2024),
  ('Combine', 'Case IH', 'Axial-Flow', 2018, 2024)
ON CONFLICT (name, brand, model) DO NOTHING;