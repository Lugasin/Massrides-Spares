/*
  # Add mock products with proper categories

  1. New Data
    - Insert 5 mock spare parts with proper categories
    - Ensure categories exist first
    - Link products to categories properly

  2. Categories
    - Engine Parts
    - Hydraulic Parts
    - Electrical Parts
    - Transmission Parts
    - Cooling System
*/

-- First ensure categories exist
INSERT INTO categories (id, name, description, is_active, sort_order) VALUES
  (gen_random_uuid(), 'Engine Parts', 'Engine components and filters', true, 1),
  (gen_random_uuid(), 'Hydraulic Parts', 'Hydraulic pumps, cylinders, and hoses', true, 2),
  (gen_random_uuid(), 'Electrical Parts', 'Alternators, starters, and wiring', true, 3),
  (gen_random_uuid(), 'Transmission Parts', 'Transmission components and filters', true, 4),
  (gen_random_uuid(), 'Cooling System', 'Radiators, thermostats, and cooling parts', true, 5)
ON CONFLICT (name) DO NOTHING;

-- Get category IDs for insertion
DO $$
DECLARE
  engine_cat_id uuid;
  hydraulic_cat_id uuid;
  electrical_cat_id uuid;
  transmission_cat_id uuid;
  cooling_cat_id uuid;
  vendor_id uuid;
BEGIN
  -- Get category IDs
  SELECT id INTO engine_cat_id FROM categories WHERE name = 'Engine Parts';
  SELECT id INTO hydraulic_cat_id FROM categories WHERE name = 'Hydraulic Parts';
  SELECT id INTO electrical_cat_id FROM categories WHERE name = 'Electrical Parts';
  SELECT id INTO transmission_cat_id FROM categories WHERE name = 'Transmission Parts';
  SELECT id INTO cooling_cat_id FROM categories WHERE name = 'Cooling System';
  
  -- Get first vendor or create a default one
  SELECT id INTO vendor_id FROM user_profiles WHERE role = 'vendor' LIMIT 1;
  
  IF vendor_id IS NULL THEN
    -- Create a default vendor profile if none exists
    INSERT INTO user_profiles (user_id, email, full_name, role, company_name)
    VALUES (gen_random_uuid(), 'vendor@massrides.co.zm', 'Default Vendor', 'vendor', 'Massrides Parts')
    RETURNING id INTO vendor_id;
  END IF;

  -- Insert mock products
  INSERT INTO spare_parts (
    id, part_number, name, description, price, brand, condition, 
    availability_status, stock_quantity, category_id, vendor_id, 
    featured, warranty, images, tags, technical_specs, compatibility
  ) VALUES
  (
    gen_random_uuid(),
    'JD-RE504836',
    'John Deere Engine Oil Filter',
    'Genuine John Deere engine oil filter for optimal engine protection and performance. High-quality filtration media ensures clean oil circulation.',
    45.99,
    'John Deere',
    'new',
    'in_stock',
    150,
    engine_cat_id,
    vendor_id,
    true,
    '12 months',
    ARRAY['/src/assets/Newtractor.png'],
    ARRAY['genuine', 'oem', 'filter', 'engine'],
    '{"filterType": "Spin-on", "threadSize": "3/4-16 UNF", "height": "4.5 inches", "diameter": "3.66 inches", "micronRating": "25 micron"}'::jsonb,
    ARRAY['6M Series', '7R Series', '8R Series']
  ),
  (
    gen_random_uuid(),
    'PK-PGP511A0280',
    'Hydraulic Pump Assembly',
    'High-performance hydraulic pump assembly for agricultural equipment. Provides reliable hydraulic power for implements and steering.',
    850.00,
    'Parker',
    'new',
    'in_stock',
    25,
    hydraulic_cat_id,
    vendor_id,
    true,
    '24 months',
    ARRAY['/src/assets/hydraulic-harrow-76-1608289508.png'],
    ARRAY['hydraulic', 'pump', 'high pressure', 'reliable'],
    '{"displacement": "28 cc/rev", "maxPressure": "3000 PSI", "maxSpeed": "3000 RPM", "mounting": "SAE A 2-bolt"}'::jsonb,
    ARRAY['Case IH Magnum', 'New Holland T7', 'John Deere 7R']
  ),
  (
    gen_random_uuid(),
    'CI-87540915',
    'Alternator 12V 95A',
    'Heavy-duty alternator for Case IH tractors and combines. 12V output, 95 amp capacity with internal voltage regulator.',
    285.00,
    'Case IH',
    'new',
    'in_stock',
    20,
    electrical_cat_id,
    vendor_id,
    true,
    '18 months',
    ARRAY['/src/assets/Newtractor5.png'],
    ARRAY['electrical', 'alternator', 'charging', 'heavy duty'],
    '{"voltage": "12V", "amperage": "95A", "rotation": "Clockwise", "mounting": "Pad mount", "regulator": "Internal"}'::jsonb,
    ARRAY['Magnum Series', 'Puma Series', 'Farmall Series']
  ),
  (
    gen_random_uuid(),
    'JD-RE234567',
    'Transmission Filter Kit',
    'Complete transmission filter kit including gaskets and seals for John Deere tractors. Essential for transmission maintenance.',
    125.00,
    'John Deere',
    'new',
    'in_stock',
    40,
    transmission_cat_id,
    vendor_id,
    false,
    '12 months',
    ARRAY['/src/assets/Newtractor8.png'],
    ARRAY['transmission', 'filter', 'kit', 'genuine', 'maintenance'],
    '{"kitContents": "Filter, gasket, seals, O-rings", "filterType": "Spin-on", "capacity": "12 quarts", "micronRating": "25 micron"}'::jsonb,
    ARRAY['7R Series', '8R Series', 'PowerShift transmission']
  ),
  (
    gen_random_uuid(),
    'KB-1C010-17114',
    'Radiator Assembly',
    'High-quality radiator assembly for Kubota tractors. Aluminum core with plastic tanks for optimal heat dissipation.',
    420.00,
    'Kubota',
    'remanufactured',
    'in_stock',
    15,
    cooling_cat_id,
    vendor_id,
    false,
    '12 months',
    ARRAY['/src/assets/Newtractor11.png'],
    ARRAY['cooling', 'radiator', 'aluminum', 'heat dissipation'],
    '{"coreType": "Aluminum", "tankMaterial": "Plastic", "rows": "2 row", "inletSize": "1.5 inches", "outletSize": "1.5 inches"}'::jsonb,
    ARRAY['M Series', 'L Series', 'Grand L Series']
  )
  ON CONFLICT (part_number) DO NOTHING;
END $$;