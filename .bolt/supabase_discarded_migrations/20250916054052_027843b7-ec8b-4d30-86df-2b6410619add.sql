-- Idempotent migration to populate spare_parts table with mock data
-- This migration will safely insert all spare parts from mock data

-- First, ensure we have some test categories if none exist
INSERT INTO public.categories (id, name, description, is_active) 
VALUES 
  (gen_random_uuid(), 'Engine Parts', 'Engine components and parts', true),
  (gen_random_uuid(), 'Hydraulic Parts', 'Hydraulic system components', true),
  (gen_random_uuid(), 'Electrical Parts', 'Electrical system components', true),
  (gen_random_uuid(), 'Transmission Parts', 'Transmission and drivetrain parts', true),
  (gen_random_uuid(), 'Cooling Parts', 'Cooling system components', true),
  (gen_random_uuid(), 'Fuel System Parts', 'Fuel delivery system parts', true),
  (gen_random_uuid(), 'Brake Parts', 'Braking system components', true),
  (gen_random_uuid(), 'Steering Parts', 'Steering system parts', true),
  (gen_random_uuid(), 'Belts & Hoses', 'Belts, hoses and related parts', true),
  (gen_random_uuid(), 'Filters', 'Various filters and filtration components', true)
ON CONFLICT (name) DO NOTHING;

-- Create a default vendor if none exists
INSERT INTO public.user_profiles (id, user_id, email, full_name, role, is_verified, is_active)
VALUES (
  gen_random_uuid(),
  gen_random_uuid(), 
  'default.vendor@example.com',
  'Default Parts Vendor',
  'vendor',
  true,
  true
) ON CONFLICT (email) DO NOTHING;

-- Get category IDs for mapping
DO $$
DECLARE
  engine_cat_id uuid;
  hydraulic_cat_id uuid;
  electrical_cat_id uuid;
  transmission_cat_id uuid;
  cooling_cat_id uuid;
  fuel_cat_id uuid;
  brake_cat_id uuid;
  steering_cat_id uuid;
  belts_cat_id uuid;
  filters_cat_id uuid;
  default_vendor_id uuid;
BEGIN
  -- Get category IDs
  SELECT id INTO engine_cat_id FROM public.categories WHERE name = 'Engine Parts' LIMIT 1;
  SELECT id INTO hydraulic_cat_id FROM public.categories WHERE name = 'Hydraulic Parts' LIMIT 1;
  SELECT id INTO electrical_cat_id FROM public.categories WHERE name = 'Electrical Parts' LIMIT 1;
  SELECT id INTO transmission_cat_id FROM public.categories WHERE name = 'Transmission Parts' LIMIT 1;
  SELECT id INTO cooling_cat_id FROM public.categories WHERE name = 'Cooling Parts' LIMIT 1;
  SELECT id INTO fuel_cat_id FROM public.categories WHERE name = 'Fuel System Parts' LIMIT 1;
  SELECT id INTO brake_cat_id FROM public.categories WHERE name = 'Brake Parts' LIMIT 1;
  SELECT id INTO steering_cat_id FROM public.categories WHERE name = 'Steering Parts' LIMIT 1;
  SELECT id INTO belts_cat_id FROM public.categories WHERE name = 'Belts & Hoses' LIMIT 1;
  SELECT id INTO filters_cat_id FROM public.categories WHERE name = 'Filters' LIMIT 1;
  SELECT id INTO default_vendor_id FROM public.user_profiles WHERE email = 'default.vendor@example.com' LIMIT 1;

  -- Insert spare parts with proper mappings
  INSERT INTO public.spare_parts (
    id, name, description, part_number, oemPartNumber, aftermarketPartNumber,
    price, condition, availabilityStatus, stockQuantity, images,
    technicalSpecs, compatibility, warranty, weight, dimensions,
    featured, tags, category_id, vendor_id, brand, created_at, updated_at
  ) VALUES
  -- Engine Parts
  (gen_random_uuid(), 'John Deere Engine Oil Filter', 'Genuine John Deere engine oil filter for optimal engine protection and performance. High-quality filtration media ensures clean oil circulation.', 'RE504836', 'RE504836', null, 45.99, 'new', 'in_stock', 150, ARRAY['/src/assets/Newtractor.png', '/src/assets/Newtractor1.png'], '{"filterType": "Spin-on", "threadSize": "3/4-16 UNF", "height": "4.5 inches", "diameter": "3.66 inches", "micronRating": "25 micron"}', ARRAY['6M Series', '7R Series', '8R Series'], '12 months', 0.8, '3.66" x 4.5"', true, ARRAY['genuine', 'oem', 'filter', 'engine'], engine_cat_id, default_vendor_id, 'John Deere', now(), now()),
  
  (gen_random_uuid(), 'John Deere Air Filter Element', 'Primary air filter element for John Deere tractors. Ensures clean air intake for optimal engine performance.', 'AR103033', 'AR103033', null, 89.50, 'new', 'in_stock', 75, ARRAY['/src/assets/Newtractor2.png', '/src/assets/Newtractor3.png'], '{"filterType": "Panel", "length": "12.5 inches", "width": "8.5 inches", "height": "2.5 inches", "efficiency": "99.5%"}', ARRAY['5E Series', '6M Series', '6R Series'], '12 months', null, null, true, ARRAY['air filter', 'engine', 'genuine'], engine_cat_id, default_vendor_id, 'John Deere', now(), now()),

  -- Hydraulic Parts  
  (gen_random_uuid(), 'Hydraulic Pump Assembly', 'High-performance hydraulic pump assembly for agricultural equipment. Provides reliable hydraulic power.', 'PGP511A0280', 'PGP511A0280', null, 850.00, 'new', 'in_stock', 25, ARRAY['/src/assets/Newtractor4.png', '/src/assets/Newtractor5.png'], '{"displacement": "28 cc/rev", "maxPressure": "3000 PSI", "maxSpeed": "3000 RPM", "mounting": "SAE A 2-bolt"}', ARRAY['Case IH', 'New Holland', 'John Deere'], '24 months', null, null, true, ARRAY['hydraulic', 'pump', 'high pressure'], hydraulic_cat_id, default_vendor_id, 'Parker', now(), now()),

  -- Electrical Parts
  (gen_random_uuid(), 'Alternator 12V 95A', 'Heavy-duty alternator for Case IH tractors and combines. 12V output, 95 amp capacity.', '87540915', '87540915', null, 285.00, 'new', 'in_stock', 20, ARRAY['/src/assets/Newtractor6.png', '/src/assets/Newtractor7.png'], '{"voltage": "12V", "amperage": "95A", "rotation": "Clockwise", "mounting": "Pad mount"}', ARRAY['Magnum Series', 'Puma Series', 'Farmall Series'], '18 months', null, null, true, ARRAY['electrical', 'alternator', 'charging'], electrical_cat_id, default_vendor_id, 'Case IH', now(), now())

  ON CONFLICT (part_number) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    stockQuantity = EXCLUDED.stockQuantity,
    updated_at = now();

END $$;