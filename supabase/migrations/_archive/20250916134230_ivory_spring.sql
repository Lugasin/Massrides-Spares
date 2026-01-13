/*
  # Migrate Product Data from Code to Database

  1. Data Migration
    - Insert all mock product data into spare_parts table
    - Create proper categories and link products
    - Set up vendor relationships
    - Preserve all product specifications and metadata

  2. Data Integrity
    - Ensure all foreign key relationships are valid
    - Set proper stock levels and availability
    - Add featured product flags
    - Include all technical specifications

  3. Search Optimization
    - Add proper tags for search functionality
    - Include compatibility information
    - Set up proper categorization
*/

-- First, ensure we have a default vendor for migrated products
DO $$
DECLARE
  default_vendor_id uuid;
  engine_cat_id uuid;
  hydraulic_cat_id uuid;
  electrical_cat_id uuid;
  transmission_cat_id uuid;
  cooling_cat_id uuid;
  fuel_cat_id uuid;
  brake_cat_id uuid;
  steering_cat_id uuid;
  cabin_cat_id uuid;
  implements_cat_id uuid;
  wheels_cat_id uuid;
BEGIN
  -- Get or create default vendor
  SELECT id INTO default_vendor_id 
  FROM user_profiles 
  WHERE role = 'vendor' AND email = 'vendor@massrides.co.zm';
  
  IF default_vendor_id IS NULL THEN
    INSERT INTO user_profiles (
      user_id, email, full_name, role, company_name, is_verified, is_active
    ) VALUES (
      gen_random_uuid(), 
      'vendor@massrides.co.zm', 
      'Massrides Default Vendor', 
      'vendor', 
      'Massrides Company Limited',
      true,
      true
    ) RETURNING id INTO default_vendor_id;
  END IF;

  -- Get category IDs
  SELECT id INTO engine_cat_id FROM categories WHERE name = 'Engine Parts';
  SELECT id INTO hydraulic_cat_id FROM categories WHERE name = 'Hydraulic Parts';
  SELECT id INTO electrical_cat_id FROM categories WHERE name = 'Electrical Parts';
  SELECT id INTO transmission_cat_id FROM categories WHERE name = 'Transmission Parts';
  SELECT id INTO cooling_cat_id FROM categories WHERE name = 'Cooling System';
  SELECT id INTO fuel_cat_id FROM categories WHERE name = 'Fuel System';
  SELECT id INTO brake_cat_id FROM categories WHERE name = 'Brake Parts';
  SELECT id INTO steering_cat_id FROM categories WHERE name = 'Steering Parts';
  SELECT id INTO cabin_cat_id FROM categories WHERE name = 'Cabin Parts';
  SELECT id INTO implements_cat_id FROM categories WHERE name = 'Implements';
  SELECT id INTO wheels_cat_id FROM categories WHERE name = 'Wheels & Tires';

  -- Insert comprehensive product data
  INSERT INTO spare_parts (
    part_number, name, description, price, brand, condition, 
    availability_status, stock_quantity, min_stock_level, category_id, 
    vendor_id, featured, warranty, images, tags, technical_specs, 
    compatibility, oem_part_number, is_active
  ) VALUES
  -- Engine Parts
  (
    'RE504836',
    'John Deere Engine Oil Filter',
    'Genuine John Deere engine oil filter for optimal engine protection and performance. High-quality filtration media ensures clean oil circulation and extends engine life.',
    45.99,
    'John Deere',
    'new',
    'in_stock',
    150,
    25,
    engine_cat_id,
    default_vendor_id,
    true,
    '12 months',
    ARRAY['/src/assets/Newtractor.png', '/src/assets/Newtractor1.png'],
    ARRAY['genuine', 'oem', 'filter', 'engine', 'oil'],
    '{"filterType": "Spin-on", "threadSize": "3/4-16 UNF", "height": "4.5 inches", "diameter": "3.66 inches", "micronRating": "25 micron", "bypassValve": "Yes"}'::jsonb,
    ARRAY['6M Series', '7R Series', '8R Series', '6068 Engine', '6090 Engine'],
    'RE504836',
    true
  ),
  (
    'AR103033',
    'John Deere Air Filter Element',
    'Primary air filter element for John Deere tractors. Ensures clean air intake for optimal engine performance and fuel efficiency.',
    89.50,
    'John Deere',
    'new',
    'in_stock',
    75,
    15,
    engine_cat_id,
    default_vendor_id,
    true,
    '12 months',
    ARRAY['/src/assets/Newtractor2.png', '/src/assets/Newtractor3.png'],
    ARRAY['air filter', 'engine', 'genuine', 'performance'],
    '{"filterType": "Panel", "length": "12.5 inches", "width": "8.5 inches", "height": "2.5 inches", "efficiency": "99.5%", "material": "Synthetic media"}'::jsonb,
    ARRAY['5E Series', '6M Series', '6R Series', '7R Series'],
    'AR103033',
    true
  ),
  (
    'RE62418',
    'Fuel Filter Water Separator',
    'Fuel filter with water separator for diesel engines. Removes water and contaminants from fuel to protect injection system.',
    125.00,
    'John Deere',
    'new',
    'in_stock',
    45,
    10,
    engine_cat_id,
    default_vendor_id,
    false,
    '12 months',
    ARRAY['/src/assets/Newtractor4.png', '/src/assets/Newtractor5.png'],
    ARRAY['fuel filter', 'water separator', 'diesel', 'protection'],
    '{"filterType": "Fuel/Water Separator", "micronRating": "10 micron", "waterCapacity": "6 oz", "flowRate": "45 GPH", "drainValve": "Manual"}'::jsonb,
    ARRAY['7R Series', '8R Series', '9R Series'],
    'RE62418',
    true
  ),
  -- Hydraulic Parts
  (
    'PGP511A0280',
    'Hydraulic Pump Assembly',
    'High-performance hydraulic pump assembly for agricultural equipment. Provides reliable hydraulic power for implements and steering.',
    850.00,
    'Parker',
    'new',
    'in_stock',
    25,
    5,
    hydraulic_cat_id,
    default_vendor_id,
    true,
    '24 months',
    ARRAY['/src/assets/hydraulic-harrow-76-1608289508.png', '/src/assets/Newtractor6.png'],
    ARRAY['hydraulic', 'pump', 'high pressure', 'reliable'],
    '{"displacement": "28 cc/rev", "maxPressure": "3000 PSI", "maxSpeed": "3000 RPM", "mounting": "SAE A 2-bolt", "portSize": "1/2 inch"}'::jsonb,
    ARRAY['Case IH Magnum', 'New Holland T7', 'John Deere 7R'],
    'PGP511A0280',
    true
  ),
  (
    'HYD-CYL-001',
    'Hydraulic Cylinder 3" Bore',
    'Heavy-duty hydraulic cylinder with 3-inch bore. Chrome-plated rod for durability and corrosion resistance.',
    285.00,
    'Parker',
    'new',
    'in_stock',
    35,
    8,
    hydraulic_cat_id,
    default_vendor_id,
    false,
    '18 months',
    ARRAY['/src/assets/Newtractor7.png', '/src/assets/Newtractor8.png'],
    ARRAY['hydraulic', 'cylinder', 'universal', 'heavy duty'],
    '{"bore": "3 inches", "stroke": "12 inches", "rodDiameter": "1.5 inches", "workingPressure": "2500 PSI", "mounting": "Clevis"}'::jsonb,
    ARRAY['Universal fit', 'Most tractors', 'Loader applications'],
    NULL,
    true
  ),
  -- Electrical Parts
  (
    '87540915',
    'Alternator 12V 95A',
    'Heavy-duty alternator for Case IH tractors and combines. 12V output, 95 amp capacity with internal voltage regulator.',
    285.00,
    'Case IH',
    'new',
    'in_stock',
    20,
    5,
    electrical_cat_id,
    default_vendor_id,
    true,
    '18 months',
    ARRAY['/src/assets/Newtractor9.png', '/src/assets/Newtractor10.png'],
    ARRAY['electrical', 'alternator', 'charging', 'heavy duty'],
    '{"voltage": "12V", "amperage": "95A", "rotation": "Clockwise", "mounting": "Pad mount", "regulator": "Internal"}'::jsonb,
    ARRAY['Magnum Series', 'Puma Series', 'Farmall Series'],
    '87540915',
    true
  ),
  (
    'SW-001-12V',
    'Ignition Switch Assembly',
    'Complete ignition switch assembly with keys. Universal fit for most agricultural equipment with weather-resistant design.',
    45.00,
    'Universal',
    'new',
    'in_stock',
    80,
    20,
    electrical_cat_id,
    default_vendor_id,
    false,
    '12 months',
    ARRAY['/src/assets/Newtractor11.png', '/src/assets/8-8.png'],
    ARRAY['electrical', 'ignition', 'switch', 'universal', 'weather resistant'],
    '{"voltage": "12V", "positions": "4 position", "terminals": "6 terminal", "keyCount": "2 keys included", "weatherSealing": "IP65"}'::jsonb,
    ARRAY['Universal fit'],
    NULL,
    true
  ),
  -- Transmission Parts
  (
    'RE234567',
    'Transmission Filter Kit',
    'Complete transmission filter kit including gaskets and seals for John Deere tractors. Essential for transmission maintenance.',
    125.00,
    'John Deere',
    'new',
    'in_stock',
    40,
    10,
    transmission_cat_id,
    default_vendor_id,
    false,
    '12 months',
    ARRAY['/src/assets/disc-harrow-76-1696055574.png', '/src/assets/disc-harrow-76-1711433455.png'],
    ARRAY['transmission', 'filter', 'kit', 'genuine', 'maintenance'],
    '{"kitContents": "Filter, gasket, seals, O-rings", "filterType": "Spin-on", "capacity": "12 quarts", "micronRating": "25 micron"}'::jsonb,
    ARRAY['7R Series', '8R Series', 'PowerShift transmission'],
    'RE234567',
    true
  ),
  -- Cooling System Parts
  (
    '1C010-17114',
    'Radiator Assembly',
    'High-quality radiator assembly for Kubota tractors. Aluminum core with plastic tanks for optimal heat dissipation.',
    420.00,
    'Kubota',
    'new',
    'in_stock',
    15,
    5,
    cooling_cat_id,
    default_vendor_id,
    false,
    '12 months',
    ARRAY['/src/assets/pivot.png', '/src/assets/pivot1.png'],
    ARRAY['cooling', 'radiator', 'aluminum', 'heat dissipation'],
    '{"coreType": "Aluminum", "tankMaterial": "Plastic", "rows": "2 row", "inletSize": "1.5 inches", "outletSize": "1.5 inches"}'::jsonb,
    ARRAY['M Series', 'L Series', 'Grand L Series'],
    '1C010-17114',
    true
  ),
  -- Fuel System Parts
  (
    '3641832M91',
    'Fuel Injection Pump',
    'Remanufactured fuel injection pump for Massey Ferguson tractors. Core exchange required. Precision-calibrated for optimal performance.',
    1250.00,
    'Massey Ferguson',
    'remanufactured',
    'in_stock',
    8,
    2,
    fuel_cat_id,
    default_vendor_id,
    true,
    '12 months',
    ARRAY['/src/assets/Sprinklers.png', '/src/assets/Sprinklers1.png'],
    ARRAY['fuel system', 'injection pump', 'remanufactured', 'precision'],
    '{"type": "Rotary", "cylinders": "4 cylinder", "rotation": "Clockwise", "coreRequired": "Yes", "calibration": "Factory tested"}'::jsonb,
    ARRAY['MF 6400', 'MF 7400', 'MF 8400'],
    '3641832M91',
    true
  ),
  -- Brake Parts
  (
    'F916200060110',
    'Brake Pad Set',
    'High-performance brake pads for Fendt tractors. Ceramic compound for long life and quiet operation.',
    95.00,
    'Fendt',
    'new',
    'in_stock',
    60,
    15,
    brake_cat_id,
    default_vendor_id,
    false,
    '6 months',
    ARRAY['/src/assets/tractor-wheel.jpg', '/src/assets/Combine.jpg'],
    ARRAY['brake', 'ceramic', 'long life', 'quiet'],
    '{"material": "Ceramic compound", "thickness": "15mm", "length": "120mm", "width": "80mm", "temperature": "Up to 800°F"}'::jsonb,
    ARRAY['Fendt 700', 'Fendt 800', 'Fendt 900'],
    'F916200060110',
    true
  )
  ON CONFLICT (part_number) DO NOTHING;
END $$;

-- Insert company partners data
INSERT INTO company_partners (name, logo_url, website_url, description, display_order, is_active) VALUES
  ('John Deere', '/company logos/John_Deere-Logo-PNG3.png', 'https://www.deere.com', 'Leading agricultural equipment manufacturer', 1, true),
  ('Case IH', '/company logos/IH_logo_PNG_(3).png', 'https://www.caseih.com', 'Agricultural and construction equipment', 2, true),
  ('New Holland', '/company logos/New_Holland_logo_PNG_(7).png', 'https://www.newholland.com', 'Agricultural machinery and equipment', 3, true),
  ('Kubota', '/company logos/Kubota_(1).png', 'https://www.kubota.com', 'Compact tractors and equipment', 4, true),
  ('Massey Ferguson', '/company logos/Massey-Ferguson-Logo.png', 'https://www.masseyferguson.com', 'Agricultural equipment and tractors', 5, true)
ON CONFLICT (name) DO NOTHING;

-- Create sample ads for vendors
INSERT INTO ads (vendor_id, title, description, image_url, target_url, ad_type, is_active) VALUES
  (
    (SELECT id FROM user_profiles WHERE role = 'vendor' LIMIT 1),
    'Premium Engine Parts Sale',
    'Get 20% off all genuine engine parts this month. Limited time offer!',
    '/src/assets/Newtractor.png',
    '/catalog?category=Engine+Parts',
    'banner',
    true
  ),
  (
    (SELECT id FROM user_profiles WHERE role = 'vendor' LIMIT 1),
    'Hydraulic System Special',
    'Complete hydraulic system overhaul packages available. Expert installation included.',
    '/src/assets/hydraulic-harrow-76-1608289508.png',
    '/catalog?category=Hydraulic+Parts',
    'featured',
    true
  )
ON CONFLICT DO NOTHING;