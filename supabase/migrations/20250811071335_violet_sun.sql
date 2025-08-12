/*
  # Idempotent Agricultural Spare Parts Database Schema
  
  This migration creates a complete spare parts management system for the PWA app.
  
  === OVERVIEW ===
  - All tables, types, and policies are idempotent (safe to re-run)
  - Comments are provided for onboarding and developer clarity
  - Sample data is included for testing and UI development
  - Real-time events are connected for all relevant tables
  - RLS (Row Level Security) is enabled and policies are set for secure access

  === MAIN MODULES ===
  1. Data Types (ENUMs)
    - user_role_enum: User roles in the system
    - part_condition_enum: Condition of spare parts
    - availability_status_enum: Stock status
    - order_status_enum: Order processing status
    - payment_status_enum: Payment processing status
    - quote_status_enum: Quote request status
    - notification_type_enum: Types of notifications
    - movement_type_enum: Inventory movement types

  2. Core Tables
    - user_profiles: Extended user information
    - spare_part_categories: Part categorization
    - equipment_types: Equipment compatibility reference
    - spare_parts: Main spare parts catalog
    - equipment_compatibility: Part-equipment compatibility matrix
    - suppliers: Supplier management
    - supplier_parts: Supplier pricing and availability

  3. E-commerce Tables
    - user_carts: User shopping carts
    - guest_carts: Guest user carts
    - cart_items: Cart line items
    - guest_cart_items: Guest cart line items
    - orders: Order management
    - order_items: Order line items
    - quotes: Quote requests
    - quote_items: Quote line items

  4. Communication Tables
    - conversations: User messaging
    - messages: Individual messages
    - notifications: System notifications
    - support_tickets: Customer support

  5. Tracking Tables
    - inventory_movements: Stock level tracking
    - product_reviews: Customer reviews
    - payment_intents: Payment processing

  6. Security
    - RLS enabled on all tables
    - Role-based access control policies
    - Secure functions with proper search_path

  7. Real-time Features
    - Real-time subscriptions for live updates
    - Triggers for automatic data management
    - Inventory tracking and notifications

  === SAMPLE DATA ===
  - Sample categories, equipment types, suppliers, and spare parts are inserted for UI testing
  - You can safely remove or modify these for production
*/

-- ============================================================================
-- 1. CREATE ENUMS (only if they don't exist)
-- ============================================================================

DO $$
BEGIN
  -- User roles enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
    CREATE TYPE user_role_enum AS ENUM (
      'super_admin',
      'admin', 
      'vendor',
      'customer',
      'guest',
      'support'
    );
  END IF;

  -- Part condition enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'part_condition_enum') THEN
    CREATE TYPE part_condition_enum AS ENUM (
      'new',
      'used', 
      'refurbished',
      'oem',
      'aftermarket'
    );
  END IF;

  -- Availability status enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'availability_status_enum') THEN
    CREATE TYPE availability_status_enum AS ENUM (
      'in_stock',
      'out_of_stock',
      'on_order', 
      'discontinued',
      'pre_order'
    );
  END IF;

  -- Order status enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status_enum') THEN
    CREATE TYPE order_status_enum AS ENUM (
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'returned'
    );
  END IF;

  -- Payment status enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_enum') THEN
    CREATE TYPE payment_status_enum AS ENUM (
      'pending',
      'processing',
      'paid',
      'failed',
      'cancelled',
      'refunded',
      'partially_refunded'
    );
  END IF;

  -- Quote status enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quote_status_enum') THEN
    CREATE TYPE quote_status_enum AS ENUM (
      'draft',
      'pending',
      'sent',
      'viewed',
      'accepted',
      'rejected',
      'revised',
      'expired',
      'cancelled'
    );
  END IF;

  -- Notification type enum
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type_enum') THEN
    CREATE TYPE notification_type_enum AS ENUM (
      'info',
      'success',
      'warning',
      'error',
      'welcome',
      'order',
      'payment',
      'message',
      'inventory',
      'quote'
    );
  END IF;

  -- Movement type enum for inventory
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'movement_type_enum') THEN
    CREATE TYPE movement_type_enum AS ENUM (
      'purchase',
      'sale',
      'adjustment',
      'return',
      'transfer',
      'damaged',
      'expired'
    );
  END IF;
END $$;

-- ============================================================================
-- 2. CREATE TABLES (in dependency order)
-- ============================================================================

-- User profiles table (enhanced)
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  phone text,
  company_name text,
  address text,
  city text,
  state text,
  zip_code text,
  country text DEFAULT 'Zambia',
  role user_role_enum DEFAULT 'customer',
  avatar_url text,
  bio text,
  website_url text,
  business_type text, -- 'dealer', 'mechanic', 'farmer', 'distributor'
  specialization text[], -- Array of specializations
  is_verified boolean DEFAULT false,
  email_verified_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Spare part categories
CREATE TABLE IF NOT EXISTS spare_part_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  parent_category_id uuid REFERENCES spare_part_categories(id),
  image_url text,
  icon_name text,
  sort_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Equipment types for compatibility
CREATE TABLE IF NOT EXISTS equipment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  brand text NOT NULL,
  model text,
  year_from integer,
  year_to integer,
  engine_type text,
  horsepower_range text,
  description text,
  image_url text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_equipment_type UNIQUE(name, brand, model)
);

-- Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  contact_person text,
  email text,
  phone text,
  address text,
  city text,
  country text DEFAULT 'Zambia',
  payment_terms text,
  lead_time_days integer DEFAULT 7,
  minimum_order_amount numeric(10,2),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Main spare parts table
CREATE TABLE IF NOT EXISTS spare_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  part_number text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category_id uuid REFERENCES spare_part_categories(id),
  vendor_id uuid REFERENCES user_profiles(id),
  brand text NOT NULL,
  oem_part_number text,
  aftermarket_part_number text,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  cost_price numeric(10,2),
  weight_kg numeric(8,3),
  dimensions_cm text, -- "L x W x H"
  material text,
  warranty_months integer DEFAULT 12,
  condition part_condition_enum DEFAULT 'new',
  availability_status availability_status_enum DEFAULT 'in_stock',
  stock_quantity integer DEFAULT 0 CHECK (stock_quantity >= 0),
  min_stock_level integer DEFAULT 5,
  max_stock_level integer DEFAULT 100,
  location_in_warehouse text,
  images text[],
  technical_specs jsonb DEFAULT '{}',
  installation_notes text,
  featured boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Equipment compatibility matrix
CREATE TABLE IF NOT EXISTS equipment_compatibility (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spare_part_id uuid REFERENCES spare_parts(id) ON DELETE CASCADE,
  equipment_type_id uuid REFERENCES equipment_types(id) ON DELETE CASCADE,
  is_direct_fit boolean DEFAULT true,
  requires_modification boolean DEFAULT false,
  compatibility_notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_part_equipment UNIQUE(spare_part_id, equipment_type_id)
);

-- Supplier parts pricing
CREATE TABLE IF NOT EXISTS supplier_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES suppliers(id) ON DELETE CASCADE,
  spare_part_id uuid REFERENCES spare_parts(id) ON DELETE CASCADE,
  supplier_part_number text,
  cost_price numeric(10,2) NOT NULL,
  minimum_order_quantity integer DEFAULT 1,
  lead_time_days integer DEFAULT 7,
  last_updated timestamptz DEFAULT now(),
  active boolean DEFAULT true,
  CONSTRAINT unique_supplier_part UNIQUE(supplier_id, spare_part_id)
);

-- User carts
CREATE TABLE IF NOT EXISTS user_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Guest carts
CREATE TABLE IF NOT EXISTS guest_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '30 days')
);

-- Cart items for authenticated users
CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid REFERENCES user_carts(id) ON DELETE CASCADE,
  spare_part_id uuid REFERENCES spare_parts(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_cart_item UNIQUE(cart_id, spare_part_id)
);

-- Guest cart items
CREATE TABLE IF NOT EXISTS guest_cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_cart_id uuid REFERENCES guest_carts(id) ON DELETE CASCADE,
  spare_part_id uuid REFERENCES spare_parts(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  CONSTRAINT unique_guest_cart_item UNIQUE(guest_cart_id, spare_part_id)
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id),
  order_number text UNIQUE NOT NULL,
  status order_status_enum DEFAULT 'pending',
  payment_status payment_status_enum DEFAULT 'pending',
  payment_intent_id text,
  total_amount numeric(10,2) NOT NULL CHECK (total_amount >= 0),
  subtotal numeric(10,2),
  tax_amount numeric(10,2) DEFAULT 0,
  shipping_amount numeric(10,2) DEFAULT 0,
  discount_amount numeric(10,2) DEFAULT 0,
  shipping_address jsonb,
  billing_address jsonb,
  delivery_method text DEFAULT 'standard',
  urgency_level text DEFAULT 'standard',
  tracking_number text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order items
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  spare_part_id uuid REFERENCES spare_parts(id),
  part_number text,
  part_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price numeric(10,2) NOT NULL CHECK (total_price >= 0),
  warranty_months integer DEFAULT 12,
  created_at timestamptz DEFAULT now()
);

-- Quotes
CREATE TABLE IF NOT EXISTS quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text UNIQUE NOT NULL,
  client_id uuid REFERENCES user_profiles(id),
  vendor_id uuid REFERENCES user_profiles(id),
  status quote_status_enum DEFAULT 'pending',
  total_amount numeric(10,2) DEFAULT 0,
  valid_until timestamptz,
  notes text,
  internal_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Quote items
CREATE TABLE IF NOT EXISTS quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES quotes(id) ON DELETE CASCADE,
  spare_part_id uuid REFERENCES spare_parts(id),
  part_number text,
  part_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price numeric(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price numeric(10,2) NOT NULL CHECK (total_price >= 0),
  notes text,
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
  CONSTRAINT unique_conversation UNIQUE(participant_1_id, participant_2_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type text DEFAULT 'text',
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type notification_type_enum DEFAULT 'info',
  read boolean DEFAULT false,
  action_url text,
  created_at timestamptz DEFAULT now()
);

-- Support tickets
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

-- Inventory movements
CREATE TABLE IF NOT EXISTS inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spare_part_id uuid REFERENCES spare_parts(id) ON DELETE CASCADE,
  movement_type movement_type_enum NOT NULL,
  quantity integer NOT NULL,
  unit_cost numeric(10,2),
  reference_number text, -- Order number, invoice number, etc.
  notes text,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Product reviews
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
  CONSTRAINT unique_user_review UNIQUE(spare_part_id, user_id)
);

-- Payment intents
CREATE TABLE IF NOT EXISTS payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  payment_provider text DEFAULT 'transaction_junction',
  provider_payment_id text,
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  status payment_status_enum DEFAULT 'pending',
  user_id uuid REFERENCES user_profiles(id),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Company partners
CREATE TABLE IF NOT EXISTS company_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  logo_url text,
  website_url text,
  description text,
  display_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- 3. ADD MISSING COLUMNS TO EXISTING TABLES
-- ============================================================================

-- Add columns to user_profiles if they don't exist
DO $$
BEGIN
  -- Business type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'business_type'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN business_type text;
  END IF;

  -- Specialization array
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'specialization'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN specialization text[];
  END IF;

  -- Last login tracking
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'last_login_at'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_login_at timestamptz;
  END IF;
END $$;

-- Add columns to orders if they don't exist
DO $$
BEGIN
  -- Urgency level
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'urgency_level'
  ) THEN
    ALTER TABLE orders ADD COLUMN urgency_level text DEFAULT 'standard';
  END IF;

  -- Delivery method
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'delivery_method'
  ) THEN
    ALTER TABLE orders ADD COLUMN delivery_method text DEFAULT 'standard';
  END IF;

  -- Tracking number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'tracking_number'
  ) THEN
    ALTER TABLE orders ADD COLUMN tracking_number text;
  END IF;
END $$;

-- Add columns to order_items if they don't exist
DO $$
BEGIN
  -- Part number
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'part_number'
  ) THEN
    ALTER TABLE order_items ADD COLUMN part_number text;
  END IF;

  -- Part name
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'part_name'
  ) THEN
    ALTER TABLE order_items ADD COLUMN part_name text;
  END IF;

  -- Warranty months
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'order_items' AND column_name = 'warranty_months'
  ) THEN
    ALTER TABLE order_items ADD COLUMN warranty_months integer DEFAULT 12;
  END IF;
END $$;

-- ============================================================================
-- 4. CREATE FUNCTIONS
-- ============================================================================

-- Function to get user role (security definer)
CREATE OR REPLACE FUNCTION get_user_role(user_uuid uuid)
RETURNS user_role_enum AS $$
  SELECT role FROM user_profiles WHERE user_id = user_uuid;
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = '';

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create user profile
  INSERT INTO user_profiles (
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
    'customer'::user_role_enum
  );

  -- Create user cart
  INSERT INTO user_carts (user_id) 
  SELECT id FROM user_profiles WHERE user_id = NEW.id;

  -- Send welcome notification
  INSERT INTO notifications (user_id, title, message, type)
  SELECT 
    id,
    'Welcome to Massrides Spare Parts!',
    'Your account has been created successfully. Start exploring our premium agricultural spare parts catalog.',
    'welcome'::notification_type_enum
  FROM user_profiles WHERE user_id = NEW.id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Function to handle email verification
CREATE OR REPLACE FUNCTION handle_email_verification()
RETURNS trigger AS $$
BEGIN
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE user_profiles 
    SET 
      is_verified = true,
      email_verified_at = NEW.email_confirmed_at
    WHERE user_id = NEW.id;

    INSERT INTO notifications (user_id, title, message, type)
    SELECT 
      id,
      'Email Verified Successfully!',
      'Your email has been verified. You now have full access to all Massrides spare parts features.',
      'success'::notification_type_enum
    FROM user_profiles WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_email_verification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Function to update stock quantity after inventory movements
CREATE OR REPLACE FUNCTION update_stock_quantity()
RETURNS trigger AS $$
BEGIN
  UPDATE spare_parts 
  SET 
    stock_quantity = stock_quantity + 
      CASE 
        WHEN NEW.movement_type IN ('purchase', 'adjustment', 'return') THEN NEW.quantity
        WHEN NEW.movement_type IN ('sale', 'transfer', 'damaged', 'expired') THEN -NEW.quantity
        ELSE 0
      END,
    updated_at = now()
  WHERE id = NEW.spare_part_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- Function to generate part numbers
CREATE OR REPLACE FUNCTION generate_part_number(brand_prefix text DEFAULT 'MP')
RETURNS text AS $$
DECLARE
  new_number text;
  counter integer;
BEGIN
  -- Get current year and generate sequential number
  SELECT COALESCE(MAX(CAST(SUBSTRING(part_number FROM LENGTH(brand_prefix) + 2) AS integer)), 0) + 1
  INTO counter
  FROM spare_parts
  WHERE part_number LIKE brand_prefix || '-%';
  
  new_number := brand_prefix || '-' || LPAD(counter::text, 6, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql SET search_path = '';

-- ============================================================================
-- 5. CREATE TRIGGERS (only if they don't exist)
-- ============================================================================

-- Check and create triggers
DO $$
BEGIN
  -- New user trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_new_user();
  END IF;

  -- Email verification trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_email_verified'
  ) THEN
    CREATE TRIGGER on_auth_user_email_verified
      AFTER UPDATE ON auth.users
      FOR EACH ROW EXECUTE FUNCTION handle_email_verification();
  END IF;

  -- Stock update trigger
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_stock_on_movement'
  ) THEN
    CREATE TRIGGER update_stock_on_movement
      AFTER INSERT ON inventory_movements
      FOR EACH ROW EXECUTE FUNCTION update_stock_quantity();
  END IF;

  -- Updated at triggers
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_user_profiles_updated_at 
      BEFORE UPDATE ON user_profiles 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_spare_parts_updated_at'
  ) THEN
    CREATE TRIGGER update_spare_parts_updated_at 
      BEFORE UPDATE ON spare_parts 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_orders_updated_at'
  ) THEN
    CREATE TRIGGER update_orders_updated_at 
      BEFORE UPDATE ON orders 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_quotes_updated_at'
  ) THEN
    CREATE TRIGGER update_quotes_updated_at 
      BEFORE UPDATE ON quotes 
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE spare_part_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_compatibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_parts ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_partners ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. CREATE POLICIES (only if they don't exist)
-- ============================================================================

-- User profiles policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE policyname = 'Users can view own profile' AND tablename = 'user_profiles') THEN
    CREATE POLICY "Users can view own profile" ON user_profiles
      FOR SELECT USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE policyname = 'Users can update own profile' AND tablename = 'user_profiles') THEN
    CREATE POLICY "Users can update own profile" ON user_profiles
      FOR UPDATE USING (user_id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE policyname = 'Admins can view all profiles' AND tablename = 'user_profiles') THEN
    CREATE POLICY "Admins can view all profiles" ON user_profiles
      FOR ALL USING (get_user_role(auth.uid()) IN ('admin', 'super_admin'));
  END IF;
END $$;

-- Spare part categories policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE policyname = 'Anyone can view categories' AND tablename = 'spare_part_categories') THEN
    CREATE POLICY "Anyone can view categories" ON spare_part_categories
      FOR SELECT USING (active = true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE policyname = 'Admins can manage categories' AND tablename = 'spare_part_categories') THEN
    CREATE POLICY "Admins can manage categories" ON spare_part_categories
      FOR ALL USING (get_user_role(auth.uid()) IN ('admin', 'super_admin'));
  END IF;
END $$;

-- Equipment types policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE policyname = 'Anyone can view equipment types' AND tablename = 'equipment_types') THEN
    CREATE POLICY "Anyone can view equipment types" ON equipment_types
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE policyname = 'Vendors can manage equipment types' AND tablename = 'equipment_types') THEN
    CREATE POLICY "Vendors can manage equipment types" ON equipment_types
      FOR ALL USING (get_user_role(auth.uid()) IN ('vendor', 'admin', 'super_admin'));
  END IF;
END $$;

-- Spare parts policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE policyname = 'Anyone can view spare parts' AND tablename = 'spare_parts') THEN
    CREATE POLICY "Anyone can view spare parts" ON spare_parts
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE policyname = 'Vendors can manage their spare parts' AND tablename = 'spare_parts') THEN
    CREATE POLICY "Vendors can manage their spare parts" ON spare_parts
      FOR ALL USING (
        vendor_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()) OR
        get_user_role(auth.uid()) IN ('admin', 'super_admin')
      );
  END IF;
END $$;

-- Cart policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE policyname = 'Users can manage their cart' AND tablename = 'user_carts') THEN
    CREATE POLICY "Users can manage their cart" ON user_carts
      FOR ALL USING (user_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE policyname = 'Users can manage their cart items' AND tablename = 'cart_items') THEN
    CREATE POLICY "Users can manage their cart items" ON cart_items
      FOR ALL USING (
        cart_id IN (
          SELECT id FROM user_carts 
          WHERE user_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid())
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE policyname = 'Anyone can manage guest carts' AND tablename = 'guest_carts') THEN
    CREATE POLICY "Anyone can manage guest carts" ON guest_carts
      FOR ALL USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE policyname = 'Anyone can manage guest cart items' AND tablename = 'guest_cart_items') THEN
    CREATE POLICY "Anyone can manage guest cart items" ON guest_cart_items
      FOR ALL USING (true);
  END IF;
END $$;

-- Order policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE policyname = 'Users can view their orders' AND tablename = 'orders') THEN
    CREATE POLICY "Users can view their orders" ON orders
      FOR SELECT USING (
        user_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()) OR
        get_user_role(auth.uid()) IN ('admin', 'super_admin')
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE policyname = 'Users can create orders' AND tablename = 'orders') THEN
    CREATE POLICY "Users can create orders" ON orders
      FOR INSERT WITH CHECK (user_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Quote policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE policyname = 'Users can view relevant quotes' AND tablename = 'quotes') THEN
    CREATE POLICY "Users can view relevant quotes" ON quotes
      FOR SELECT USING (
        client_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()) OR
        vendor_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()) OR
        get_user_role(auth.uid()) IN ('admin', 'super_admin')
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE policyname = 'Vendors can manage quotes' AND tablename = 'quotes') THEN
    CREATE POLICY "Vendors can manage quotes" ON quotes
      FOR ALL USING (
        vendor_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()) OR
        get_user_role(auth.uid()) IN ('admin', 'super_admin')
      );
  END IF;
END $$;

-- Message policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE policyname = 'Users can view their messages' AND tablename = 'messages') THEN
    CREATE POLICY "Users can view their messages" ON messages
      FOR SELECT USING (
        sender_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()) OR
        recipient_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE policyname = 'Users can send messages' AND tablename = 'messages') THEN
    CREATE POLICY "Users can send messages" ON messages
      FOR INSERT WITH CHECK (sender_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Notification policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE policyname = 'Users can view their notifications' AND tablename = 'notifications') THEN
    CREATE POLICY "Users can view their notifications" ON notifications
      FOR SELECT USING (user_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE policyname = 'Users can update their notifications' AND tablename = 'notifications') THEN
    CREATE POLICY "Users can update their notifications" ON notifications
      FOR UPDATE USING (user_id IN (SELECT id FROM user_profiles WHERE user_id = auth.uid()));
  END IF;
END $$;

-- Company partners policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE policyname = 'Anyone can view active partners' AND tablename = 'company_partners') THEN
    CREATE POLICY "Anyone can view active partners" ON company_partners
      FOR SELECT USING (active = true);
  END IF;
END $$;

-- ============================================================================
-- 8. CREATE INDEXES (only if they don't exist)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_spare_parts_category ON spare_parts(category_id);
CREATE INDEX IF NOT EXISTS idx_spare_parts_vendor ON spare_parts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_spare_parts_part_number ON spare_parts(part_number);
CREATE INDEX IF NOT EXISTS idx_spare_parts_brand ON spare_parts(brand);
CREATE INDEX IF NOT EXISTS idx_spare_parts_featured ON spare_parts(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_spare_parts_availability ON spare_parts(availability_status);
CREATE INDEX IF NOT EXISTS idx_spare_parts_search ON spare_parts USING gin(to_tsvector('english', name || ' ' || description || ' ' || brand));
CREATE INDEX IF NOT EXISTS idx_equipment_compatibility_part ON equipment_compatibility(spare_part_id);
CREATE INDEX IF NOT EXISTS idx_equipment_compatibility_equipment ON equipment_compatibility(equipment_type_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_guest_cart_items_cart ON guest_cart_items(guest_cart_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(recipient_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read) WHERE read = false;
CREATE INDEX IF NOT EXISTS idx_inventory_movements_part ON inventory_movements(spare_part_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_quotes_client ON quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_vendor ON quotes(vendor_id);

-- ============================================================================
-- 9. ENABLE REALTIME (only if not already enabled)
-- ============================================================================

DO $$
BEGIN
  -- Check and add tables to realtime publication
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON pr.prrelid = c.oid 
    WHERE c.relname = 'spare_parts' AND pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE spare_parts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON pr.prrelid = c.oid 
    WHERE c.relname = 'cart_items' AND pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE cart_items;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON pr.prrelid = c.oid 
    WHERE c.relname = 'messages' AND pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON pr.prrelid = c.oid 
    WHERE c.relname = 'notifications' AND pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON pr.prrelid = c.oid 
    WHERE c.relname = 'orders' AND pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_rel pr 
    JOIN pg_class c ON pr.prrelid = c.oid 
    WHERE c.relname = 'quotes' AND pr.prpubid = (SELECT oid FROM pg_publication WHERE pubname = 'supabase_realtime')
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE quotes;
  END IF;
END $$;

-- ============================================================================
-- 10. INSERT SEED DATA (with conflict handling)
-- ============================================================================

-- Insert spare part categories
INSERT INTO spare_part_categories (name, description, icon_name, sort_order) VALUES
  ('Engine Parts', 'Engine components, filters, belts, and engine accessories', 'Package', 1),
  ('Hydraulic Parts', 'Hydraulic pumps, cylinders, hoses, and fittings', 'Wrench', 2),
  ('Electrical Parts', 'Wiring, sensors, switches, and electrical components', 'Zap', 3),
  ('Transmission Parts', 'Gearbox components, clutches, and drive parts', 'Settings', 4),
  ('Cooling System', 'Radiators, thermostats, water pumps, and cooling components', 'Thermometer', 5),
  ('Fuel System', 'Fuel pumps, injectors, tanks, and fuel line components', 'Fuel', 6),
  ('Brake Parts', 'Brake pads, discs, hydraulic brake components', 'Disc', 7),
  ('Steering Parts', 'Steering wheels, columns, and steering system components', 'Navigation', 8),
  ('Cabin Parts', 'Seats, glass, interior components, and cabin accessories', 'Home', 9),
  ('Implements', 'Plow parts, cultivator components, and implement accessories', 'Tool', 10),
  ('Wheels & Tires', 'Tires, rims, and wheel components', 'Circle', 11)
ON CONFLICT (name) DO NOTHING;

-- Insert equipment types
INSERT INTO equipment_types (name, brand, model, year_from, year_to, description) VALUES
  ('Tractor', 'John Deere', '6M Series', 2015, 2024, 'Mid-range utility tractors 110-170 HP'),
  ('Tractor', 'John Deere', '7R Series', 2018, 2024, 'Row crop tractors 210-370 HP'),
  ('Tractor', 'John Deere', '8R Series', 2020, 2024, 'High-horsepower tractors 370-410 HP'),
  ('Tractor', 'Case IH', 'Magnum Series', 2016, 2024, 'High-horsepower tractors 280-380 HP'),
  ('Tractor', 'Case IH', 'Puma Series', 2017, 2024, 'Versatile tractors 165-240 HP'),
  ('Tractor', 'New Holland', 'T7 Series', 2015, 2024, 'Versatile tractors 165-315 HP'),
  ('Tractor', 'Kubota', 'M Series', 2018, 2024, 'Utility tractors 85-170 HP'),
  ('Tractor', 'Massey Ferguson', 'MF 6400', 2016, 2024, 'Global series tractors 145-240 HP'),
  ('Combine', 'John Deere', 'S Series', 2017, 2024, 'Combine harvesters with advanced technology'),
  ('Combine', 'Case IH', 'Axial-Flow', 2018, 2024, 'High-capacity combine harvesters')
ON CONFLICT (name, brand, model) DO NOTHING;

-- Insert company partners
INSERT INTO company_partners (name, logo_url, website_url, description, display_order) VALUES
  ('John Deere', 'https://logos-world.net/wp-content/uploads/2020/04/John-Deere-Logo.png', 'https://www.deere.com', 'Leading manufacturer of agricultural machinery and spare parts', 1),
  ('Case IH', 'https://logos-world.net/wp-content/uploads/2020/04/Case-IH-Logo.png', 'https://www.caseih.com', 'Global leader in agricultural equipment and spare parts', 2),
  ('New Holland', 'https://logos-world.net/wp-content/uploads/2020/04/New-Holland-Logo.png', 'https://www.newholland.com', 'Agricultural and construction equipment spare parts', 3),
  ('Kubota', 'https://logos-world.net/wp-content/uploads/2020/04/Kubota-Logo.png', 'https://www.kubota.com', 'Compact and utility tractor spare parts specialist', 4),
  ('Massey Ferguson', 'https://1000logos.net/wp-content/uploads/2020/09/Massey-Ferguson-Logo.png', 'https://www.masseyferguson.com', 'Global agricultural equipment spare parts brand', 5)
ON CONFLICT (name) DO NOTHING;

-- Insert sample suppliers
INSERT INTO suppliers (name, contact_person, email, phone, city, country) VALUES
  ('AgriParts Zambia Ltd', 'James Mwanza', 'james@agriparts.zm', '+260-211-123456', 'Lusaka', 'Zambia'),
  ('Tractor Components Co', 'Sarah Banda', 'sarah@tractorparts.zm', '+260-977-654321', 'Ndola', 'Zambia'),
  ('Hydraulic Solutions', 'Peter Phiri', 'peter@hydraulics.zm', '+260-966-789012', 'Kitwe', 'Zambia'),
  ('Engine Parts Direct', 'Mary Tembo', 'mary@engineparts.zm', '+260-955-345678', 'Livingstone', 'Zambia')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 11. HELPER FUNCTIONS FOR APPLICATION
-- ============================================================================

-- Function to get guest session ID
CREATE OR REPLACE FUNCTION get_guest_session_id()
RETURNS text AS $$
BEGIN
  RETURN current_setting('request.headers', true)::json->>'x-guest-session-id';
EXCEPTION
  WHEN OTHERS THEN
    RETURN null;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Function to get role permissions
CREATE OR REPLACE FUNCTION get_role_permissions(user_role text)
RETURNS text[] AS $$
DECLARE
  permissions text[];
BEGIN
  CASE user_role
    WHEN 'super_admin' THEN
      permissions := ARRAY['all'];
    WHEN 'admin' THEN
      permissions := ARRAY['manage_spare_parts', 'manage_orders', 'manage_users', 'view_analytics'];
    WHEN 'vendor' THEN
      permissions := ARRAY['manage_own_spare_parts', 'view_own_orders', 'manage_quotes'];
    WHEN 'customer' THEN
      permissions := ARRAY['place_orders', 'view_own_orders', 'request_quotes'];
    ELSE
      permissions := ARRAY['view_catalog'];
  END CASE;
  
  RETURN permissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ============================================================================
-- 12. FINAL VALIDATION
-- ============================================================================

-- Validate that all critical tables exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spare_parts') THEN
    RAISE EXCEPTION 'Critical table spare_parts was not created successfully';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    RAISE EXCEPTION 'Critical table user_profiles was not created successfully';
  END IF;
  
  RAISE NOTICE 'Agricultural spare parts schema migration completed successfully';
END $$;
