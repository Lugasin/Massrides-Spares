/*
  # Agricultural Spare Parts Database Schema

  1. New Tables
    - `spare_part_categories` - Categories for spare parts (engine, hydraulic, electrical, etc.)
    - `spare_parts` - Main spare parts inventory
    - `compatibility` - Vehicle/equipment compatibility matrix
    - `inventory_tracking` - Stock levels and warehouse management
    - `part_specifications` - Technical specifications for parts
    - `supplier_parts` - Supplier relationship and pricing

  2. Updated Tables
    - Modified `products` table to focus on spare parts
    - Updated `user_profiles` for parts dealers and mechanics
    - Enhanced `orders` for parts ordering workflow

  3. Security
    - Enable RLS on all tables
    - Add policies for different user roles
    - Secure supplier and inventory data
*/

-- Create spare part categories
CREATE TABLE IF NOT EXISTS public.spare_part_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_category_id UUID REFERENCES public.spare_part_categories(id),
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create equipment types for compatibility
CREATE TABLE IF NOT EXISTS public.equipment_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  brand TEXT,
  model TEXT,
  year_from INTEGER,
  year_to INTEGER,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create spare parts table (enhanced products)
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
  dimensions_cm TEXT, -- "L x W x H"
  material TEXT,
  warranty_months INTEGER DEFAULT 12,
  condition TEXT DEFAULT 'new' CHECK (condition IN ('new', 'used', 'refurbished')),
  availability_status TEXT DEFAULT 'in_stock' CHECK (availability_status IN ('in_stock', 'out_of_stock', 'on_order', 'discontinued')),
  stock_quantity INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 5,
  max_stock_level INTEGER DEFAULT 100,
  location_in_warehouse TEXT,
  images TEXT[],
  technical_specs JSONB,
  installation_notes TEXT,
  featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create compatibility matrix
CREATE TABLE IF NOT EXISTS public.part_compatibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spare_part_id UUID REFERENCES public.spare_parts(id) ON DELETE CASCADE,
  equipment_type_id UUID REFERENCES public.equipment_types(id) ON DELETE CASCADE,
  is_direct_fit BOOLEAN DEFAULT true,
  requires_modification BOOLEAN DEFAULT false,
  compatibility_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(spare_part_id, equipment_type_id)
);

-- Create suppliers table
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

-- Create supplier parts pricing
CREATE TABLE IF NOT EXISTS public.supplier_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
  spare_part_id UUID REFERENCES public.spare_parts(id) ON DELETE CASCADE,
  supplier_part_number TEXT,
  cost_price DECIMAL(10,2) NOT NULL,
  minimum_order_quantity INTEGER DEFAULT 1,
  lead_time_days INTEGER DEFAULT 7,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
  active BOOLEAN DEFAULT true,
  UNIQUE(supplier_id, spare_part_id)
);

-- Create inventory movements table
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spare_part_id UUID REFERENCES public.spare_parts(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('purchase', 'sale', 'adjustment', 'return', 'transfer')),
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2),
  reference_number TEXT, -- Order number, invoice number, etc.
  notes TEXT,
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Update user profiles for spare parts business
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS business_type TEXT CHECK (business_type IN ('dealer', 'mechanic', 'farmer', 'distributor', 'manufacturer'));

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS specialization TEXT[]; -- Array of specializations like ['hydraulics', 'engines', 'electrical']

-- Update orders table for spare parts
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS urgency_level TEXT DEFAULT 'standard' CHECK (urgency_level IN ('standard', 'urgent', 'emergency'));

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS delivery_method TEXT DEFAULT 'standard' CHECK (delivery_method IN ('standard', 'express', 'pickup', 'installation'));

-- Update order items for spare parts
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS part_number TEXT;

ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS warranty_months INTEGER DEFAULT 12;

-- Enable RLS on new tables
ALTER TABLE public.spare_part_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spare_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.part_compatibility ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for spare part categories (public read)
CREATE POLICY "Anyone can view spare part categories" ON public.spare_part_categories
  FOR SELECT USING (active = true);

CREATE POLICY "Vendors can manage categories" ON public.spare_part_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('vendor', 'admin', 'super_admin'))
  );

-- RLS Policies for equipment types (public read)
CREATE POLICY "Anyone can view equipment types" ON public.equipment_types
  FOR SELECT USING (true);

CREATE POLICY "Vendors can manage equipment types" ON public.equipment_types
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('vendor', 'admin', 'super_admin'))
  );

-- RLS Policies for spare parts (public read, vendor manage)
CREATE POLICY "Anyone can view spare parts" ON public.spare_parts
  FOR SELECT USING (true);

CREATE POLICY "Vendors can manage their spare parts" ON public.spare_parts
  FOR ALL USING (
    vendor_id IN (SELECT id FROM public.user_profiles WHERE user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- RLS Policies for compatibility
CREATE POLICY "Anyone can view compatibility" ON public.part_compatibility
  FOR SELECT USING (true);

CREATE POLICY "Vendors can manage compatibility" ON public.part_compatibility
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.spare_parts sp 
      WHERE sp.id = spare_part_id AND sp.vendor_id IN (
        SELECT id FROM public.user_profiles WHERE user_id = auth.uid()
      )
    ) OR
    EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- RLS Policies for suppliers
CREATE POLICY "Vendors can view suppliers" ON public.suppliers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('vendor', 'admin', 'super_admin'))
  );

CREATE POLICY "Admins can manage suppliers" ON public.suppliers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- RLS Policies for supplier parts
CREATE POLICY "Vendors can view supplier parts" ON public.supplier_parts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('vendor', 'admin', 'super_admin'))
  );

CREATE POLICY "Vendors can manage supplier parts" ON public.supplier_parts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.spare_parts sp 
      WHERE sp.id = spare_part_id AND sp.vendor_id IN (
        SELECT id FROM public.user_profiles WHERE user_id = auth.uid()
      )
    ) OR
    EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- RLS Policies for inventory movements
CREATE POLICY "Vendors can view their inventory movements" ON public.inventory_movements
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.spare_parts sp 
      WHERE sp.id = spare_part_id AND sp.vendor_id IN (
        SELECT id FROM public.user_profiles WHERE user_id = auth.uid()
      )
    ) OR
    EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

CREATE POLICY "Vendors can create inventory movements" ON public.inventory_movements
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.spare_parts sp 
      WHERE sp.id = spare_part_id AND sp.vendor_id IN (
        SELECT id FROM public.user_profiles WHERE user_id = auth.uid()
      )
    ) OR
    EXISTS (SELECT 1 FROM public.user_profiles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- Insert sample spare part categories
INSERT INTO public.spare_part_categories (name, description, sort_order) VALUES
('Engine Parts', 'Engine components, filters, belts, and engine accessories', 1),
('Hydraulic Parts', 'Hydraulic pumps, cylinders, hoses, and fittings', 2),
('Electrical Parts', 'Wiring, sensors, switches, and electrical components', 3),
('Transmission Parts', 'Gearbox components, clutches, and drive parts', 4),
('Cooling System', 'Radiators, thermostats, water pumps, and cooling components', 5),
('Fuel System', 'Fuel pumps, injectors, tanks, and fuel line components', 6),
('Brake Parts', 'Brake pads, discs, hydraulic brake components', 7),
('Steering Parts', 'Steering wheels, columns, and steering system components', 8),
('Cabin Parts', 'Seats, glass, interior components, and cabin accessories', 9),
('Implements', 'Plow parts, cultivator components, and implement accessories', 10);

-- Insert sample equipment types
INSERT INTO public.equipment_types (name, brand, description) VALUES
('Tractor - Compact', 'Various', 'Compact tractors 25-50 HP'),
('Tractor - Utility', 'Various', 'Utility tractors 50-100 HP'),
('Tractor - Row Crop', 'Various', 'Row crop tractors 100-200 HP'),
('Tractor - High HP', 'Various', 'High horsepower tractors 200+ HP'),
('Combine Harvester', 'Various', 'Combine harvesters and grain equipment'),
('Plough', 'Various', 'Plowing equipment and implements'),
('Cultivator', 'Various', 'Cultivation and tillage equipment'),
('Planter/Seeder', 'Various', 'Planting and seeding equipment'),
('Sprayer', 'Various', 'Crop spraying equipment'),
('Irrigation Equipment', 'Various', 'Irrigation systems and components');

-- Insert sample suppliers
INSERT INTO public.suppliers (name, contact_person, email, phone, city, country) VALUES
('AgriParts Zambia Ltd', 'James Mwanza', 'james@agriparts.zm', '+260-211-123456', 'Lusaka', 'Zambia'),
('Tractor Components Co', 'Sarah Banda', 'sarah@tractorparts.zm', '+260-977-654321', 'Ndola', 'Zambia'),
('Hydraulic Solutions', 'Peter Phiri', 'peter@hydraulics.zm', '+260-966-789012', 'Kitwe', 'Zambia'),
('Engine Parts Direct', 'Mary Tembo', 'mary@engineparts.zm', '+260-955-345678', 'Livingstone', 'Zambia');

-- Create updated_at triggers for new tables
CREATE TRIGGER update_spare_part_categories_updated_at 
  BEFORE UPDATE ON public.spare_part_categories 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_spare_parts_updated_at 
  BEFORE UPDATE ON public.spare_parts 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at 
  BEFORE UPDATE ON public.suppliers 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_spare_parts_category ON public.spare_parts(category_id);
CREATE INDEX IF NOT EXISTS idx_spare_parts_vendor ON public.spare_parts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_spare_parts_part_number ON public.spare_parts(part_number);
CREATE INDEX IF NOT EXISTS idx_spare_parts_brand ON public.spare_parts(brand);
CREATE INDEX IF NOT EXISTS idx_compatibility_part ON public.part_compatibility(spare_part_id);
CREATE INDEX IF NOT EXISTS idx_compatibility_equipment ON public.part_compatibility(equipment_type_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_part ON public.inventory_movements(spare_part_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON public.inventory_movements(created_at);

-- Function to update stock quantity after inventory movements
CREATE OR REPLACE FUNCTION public.update_stock_quantity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.spare_parts 
    SET stock_quantity = stock_quantity + 
      CASE 
        WHEN NEW.movement_type IN ('purchase', 'adjustment', 'return') THEN NEW.quantity
        WHEN NEW.movement_type IN ('sale', 'transfer') THEN -NEW.quantity
        ELSE 0
      END
    WHERE id = NEW.spare_part_id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for stock updates
CREATE TRIGGER update_stock_on_movement
  AFTER INSERT ON public.inventory_movements
  FOR EACH ROW EXECUTE FUNCTION public.update_stock_quantity();

-- Function to get user role for RLS
CREATE OR REPLACE FUNCTION public.get_user_role_new(user_uuid UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.user_profiles WHERE user_id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = '';