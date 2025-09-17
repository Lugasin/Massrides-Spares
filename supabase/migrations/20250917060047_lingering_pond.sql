/*
  # Core Tables Migration

  1. New Tables
    - `user_profiles` - User information and roles with proper auth integration
    - `categories` - Product categories with hierarchical support
    - `spare_parts` - Product catalog with comprehensive specifications
    - `user_carts` - User shopping carts
    - `cart_items` - Cart line items with proper relationships

  2. Security
    - Enable RLS on all tables
    - Add policies for role-based access control
    - Create proper foreign key constraints

  3. Performance
    - Add indexes for frequently queried columns
    - Create composite indexes for complex queries
*/

-- =====================================================
-- CORE TABLES CREATION
-- =====================================================

-- User Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
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
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Categories Table
CREATE TABLE IF NOT EXISTS public.categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    image_url text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Spare Parts Table
CREATE TABLE IF NOT EXISTS public.spare_parts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
    name text NOT NULL,
    description text,
    part_number text NOT NULL,
    oem_part_number text,
    aftermarket_part_number text,
    brand text,
    price numeric(10,2) NOT NULL CHECK (price >= 0),
    condition text DEFAULT 'new' CHECK (condition IN ('new', 'used', 'refurbished', 'oem', 'aftermarket')),
    availability_status text DEFAULT 'in_stock' CHECK (availability_status IN ('in_stock', 'out_of_stock', 'on_order', 'discontinued')),
    stock_quantity integer DEFAULT 0 CHECK (stock_quantity >= 0),
    min_stock_level integer DEFAULT 5 CHECK (min_stock_level >= 0),
    images text[] DEFAULT '{}',
    technical_specs jsonb DEFAULT '{}',
    compatibility text[] DEFAULT '{}',
    warranty text DEFAULT '12 months',
    weight numeric(8,2),
    dimensions text,
    featured boolean DEFAULT false,
    tags text[] DEFAULT '{}',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- User Carts Table
CREATE TABLE IF NOT EXISTS public.user_carts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Cart Items Table
CREATE TABLE IF NOT EXISTS public.cart_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id uuid REFERENCES public.user_carts(id) ON DELETE CASCADE NOT NULL,
    spare_part_id uuid REFERENCES public.spare_parts(id) ON DELETE CASCADE NOT NULL,
    quantity integer NOT NULL CHECK (quantity > 0),
    added_at timestamptz DEFAULT now(),
    UNIQUE(cart_id, spare_part_id)
);

-- Guest Carts Table
CREATE TABLE IF NOT EXISTS public.guest_carts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Guest Cart Items Table
CREATE TABLE IF NOT EXISTS public.guest_cart_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_cart_id uuid REFERENCES public.guest_carts(id) ON DELETE CASCADE NOT NULL,
    spare_part_id uuid REFERENCES public.spare_parts(id) ON DELETE CASCADE NOT NULL,
    quantity integer NOT NULL CHECK (quantity > 0),
    added_at timestamptz DEFAULT now(),
    UNIQUE(guest_cart_id, spare_part_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- User Profiles Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON public.user_profiles(is_active);

-- Categories Indexes
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON public.categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_sort_order ON public.categories(sort_order);

-- Spare Parts Indexes
CREATE INDEX IF NOT EXISTS idx_spare_parts_vendor_id ON public.spare_parts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_spare_parts_category_id ON public.spare_parts(category_id);
CREATE INDEX IF NOT EXISTS idx_spare_parts_part_number ON public.spare_parts(part_number);
CREATE INDEX IF NOT EXISTS idx_spare_parts_brand ON public.spare_parts(brand);
CREATE INDEX IF NOT EXISTS idx_spare_parts_featured ON public.spare_parts(featured);
CREATE INDEX IF NOT EXISTS idx_spare_parts_availability ON public.spare_parts(availability_status);
CREATE INDEX IF NOT EXISTS idx_spare_parts_is_active ON public.spare_parts(is_active);
CREATE INDEX IF NOT EXISTS idx_spare_parts_price ON public.spare_parts(price);
CREATE INDEX IF NOT EXISTS idx_spare_parts_stock ON public.spare_parts(stock_quantity);

-- Full-text search index for spare parts
CREATE INDEX IF NOT EXISTS idx_spare_parts_search ON public.spare_parts 
USING gin(to_tsvector('english', name || ' ' || description || ' ' || part_number || ' ' || brand));

-- Cart Indexes
CREATE INDEX IF NOT EXISTS idx_user_carts_user_id ON public.user_carts(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_spare_part_id ON public.cart_items(spare_part_id);
CREATE INDEX IF NOT EXISTS idx_guest_carts_session_id ON public.guest_carts(session_id);
CREATE INDEX IF NOT EXISTS idx_guest_cart_items_guest_cart_id ON public.guest_cart_items(guest_cart_id);

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_cart_items ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile"
    ON public.user_profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.user_profiles;
CREATE POLICY "Admins can read all profiles"
    ON public.user_profiles FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid() 
            AND up.role IN ('admin', 'super_admin')
        )
    );

-- Categories Policies (public read, admin write)
DROP POLICY IF EXISTS "Anyone can read categories" ON public.categories;
CREATE POLICY "Anyone can read categories"
    ON public.categories FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories"
    ON public.categories FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid() 
            AND up.role IN ('admin', 'super_admin')
        )
    );

-- Spare Parts Policies
DROP POLICY IF EXISTS "Anyone can read active spare parts" ON public.spare_parts;
CREATE POLICY "Anyone can read active spare parts"
    ON public.spare_parts FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

DROP POLICY IF EXISTS "Vendors can manage own spare parts" ON public.spare_parts;
CREATE POLICY "Vendors can manage own spare parts"
    ON public.spare_parts FOR ALL
    TO authenticated
    USING (
        vendor_id IN (
            SELECT id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins can manage all spare parts" ON public.spare_parts;
CREATE POLICY "Admins can manage all spare parts"
    ON public.spare_parts FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid() 
            AND up.role IN ('admin', 'super_admin')
        )
    );

-- Cart Policies
DROP POLICY IF EXISTS "Users can manage own cart" ON public.user_carts;
CREATE POLICY "Users can manage own cart"
    ON public.user_carts FOR ALL
    TO authenticated
    USING (
        user_id IN (
            SELECT id FROM public.user_profiles 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage own cart items" ON public.cart_items;
CREATE POLICY "Users can manage own cart items"
    ON public.cart_items FOR ALL
    TO authenticated
    USING (
        cart_id IN (
            SELECT uc.id FROM public.user_carts uc
            JOIN public.user_profiles up ON uc.user_id = up.id
            WHERE up.user_id = auth.uid()
        )
    );

-- Guest Cart Policies (no RLS needed for guest carts as they use session_id)
DROP POLICY IF EXISTS "Anyone can manage guest carts" ON public.guest_carts;
CREATE POLICY "Anyone can manage guest carts"
    ON public.guest_carts FOR ALL
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS "Anyone can manage guest cart items" ON public.guest_cart_items;
CREATE POLICY "Anyone can manage guest cart items"
    ON public.guest_cart_items FOR ALL
    TO anon, authenticated
    USING (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get current user's profile ID
CREATE OR REPLACE FUNCTION public.uid()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT id FROM public.user_profiles WHERE user_id = auth.uid();
$$;

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(_role text, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_id = _user_id AND role = _role
    );
$$;

-- Function to check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT public.has_role('super_admin', _user_id);
$$;

-- =====================================================
-- TRIGGERS FOR AUTOMATION
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Add updated_at triggers to all tables with updated_at column
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_categories_updated_at ON public.categories;
CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_spare_parts_updated_at ON public.spare_parts;
CREATE TRIGGER update_spare_parts_updated_at
    BEFORE UPDATE ON public.spare_parts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_carts_updated_at ON public.user_carts;
CREATE TRIGGER update_user_carts_updated_at
    BEFORE UPDATE ON public.user_carts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_guest_carts_updated_at ON public.guest_carts;
CREATE TRIGGER update_guest_carts_updated_at
    BEFORE UPDATE ON public.guest_carts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_profiles (user_id, email, full_name, phone, company_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'company_name'
    );
    RETURN NEW;
END;
$$;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- INITIAL DATA SEEDING
-- =====================================================

-- Insert default categories if they don't exist
INSERT INTO public.categories (name, description, sort_order) 
VALUES 
    ('Engine Parts', 'Engine components and accessories', 1),
    ('Hydraulic Parts', 'Hydraulic system components', 2),
    ('Electrical Parts', 'Electrical components and wiring', 3),
    ('Transmission Parts', 'Transmission and drivetrain components', 4),
    ('Cooling System', 'Cooling system components', 5),
    ('Fuel System', 'Fuel system components', 6),
    ('Brake Parts', 'Brake system components', 7),
    ('Steering Parts', 'Steering system components', 8),
    ('Cabin Parts', 'Cabin and operator comfort parts', 9),
    ('Implements', 'Implement attachments and parts', 10),
    ('Wheels & Tires', 'Wheels, tires, and related components', 11)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.user_profiles IS 'Extended user profile information linked to auth.users';
COMMENT ON TABLE public.categories IS 'Product categories with hierarchical support';
COMMENT ON TABLE public.spare_parts IS 'Agricultural spare parts catalog with comprehensive specifications';
COMMENT ON TABLE public.user_carts IS 'User shopping carts for authenticated users';
COMMENT ON TABLE public.cart_items IS 'Individual items in user shopping carts';
COMMENT ON TABLE public.guest_carts IS 'Shopping carts for guest users identified by session';
COMMENT ON TABLE public.guest_cart_items IS 'Individual items in guest shopping carts';

COMMENT ON FUNCTION public.uid() IS 'Returns the current user profile ID';
COMMENT ON FUNCTION public.has_role(text, uuid) IS 'Checks if a user has a specific role';
COMMENT ON FUNCTION public.is_super_admin(uuid) IS 'Checks if a user is a super admin';
COMMENT ON FUNCTION public.handle_new_user() IS 'Creates user profile when new auth user is created';