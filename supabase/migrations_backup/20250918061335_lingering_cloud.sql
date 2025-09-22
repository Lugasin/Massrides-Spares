/*
  # Populate Sample Data for E-commerce Platform

  1. Sample Data
    - Insert realistic product data with proper categories
    - Create sample vendors and customers
    - Add company partners and advertisements
    - Include various product conditions and stock levels

  2. Data Integrity
    - Ensure all foreign key relationships are valid
    - Set proper stock levels and availability
    - Include realistic pricing and specifications

  3. Testing Data
    - Products with different statuses (active, inactive, out of stock)
    - Various user roles for testing
    - Sample orders and transactions
*/

-- =====================================================
-- ENSURE CATEGORIES EXIST
-- =====================================================

INSERT INTO public.categories (name, description, sort_order, is_active) VALUES
  ('Engine Parts', 'Engine components including filters, gaskets, pistons, and turbochargers', 1, true),
  ('Hydraulic Parts', 'Hydraulic system components including pumps, cylinders, hoses, and valves', 2, true),
  ('Electrical Parts', 'Electrical components including alternators, starters, switches, and wiring', 3, true),
  ('Transmission Parts', 'Transmission and drivetrain components', 4, true),
  ('Cooling System', 'Cooling system components including radiators and thermostats', 5, true),
  ('Fuel System', 'Fuel system components including pumps and injection systems', 6, true),
  ('Brake Parts', 'Brake system components including pads and hydraulic parts', 7, true),
  ('Steering Parts', 'Steering system components', 8, true),
  ('Cabin Parts', 'Cabin and operator comfort components', 9, true),
  ('Implements', 'Implement attachments and agricultural tools', 10, true),
  ('Wheels & Tires', 'Wheels, tires, and related components', 11, true)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- =====================================================
-- CREATE SAMPLE VENDORS
-- =====================================================

-- Create sample vendor users (these would normally be created through registration)
DO $$
DECLARE
  vendor1_id uuid;
  vendor2_id uuid;
  admin_id uuid;
  engine_cat_id uuid;
  hydraulic_cat_id uuid;
  electrical_cat_id uuid;
  transmission_cat_id uuid;
  cooling_cat_id uuid;
  fuel_cat_id uuid;
  brake_cat_id uuid;
  implements_cat_id uuid;
  wheels_cat_id uuid;
BEGIN
  -- Create sample vendor profiles
  INSERT INTO public.user_profiles (
    user_id, email, full_name, company_name, role, is_verified, is_active
  ) VALUES 
    (gen_random_uuid(), 'vendor1@massrides.co.zm', 'John Smith', 'Smith Agricultural Parts', 'vendor', true, true),
    (gen_random_uuid(), 'vendor2@massrides.co.zm', 'Mary Johnson', 'Johnson Equipment Supply', 'vendor', true, true),
    (gen_random_uuid(), 'admin@massrides.co.zm', 'Admin User', 'Massrides Company Limited', 'admin', true, true)
  ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    company_name = EXCLUDED.company_name,
    updated_at = NOW()
  RETURNING id INTO vendor1_id;

  -- Get vendor IDs
  SELECT id INTO vendor1_id FROM public.user_profiles WHERE email = 'vendor1@massrides.co.zm';
  SELECT id INTO vendor2_id FROM public.user_profiles WHERE email = 'vendor2@massrides.co.zm';
  SELECT id INTO admin_id FROM public.user_profiles WHERE email = 'admin@massrides.co.zm';

  -- Get category IDs
  SELECT id INTO engine_cat_id FROM public.categories WHERE name = 'Engine Parts';
  SELECT id INTO hydraulic_cat_id FROM public.categories WHERE name = 'Hydraulic Parts';
  SELECT id INTO electrical_cat_id FROM public.categories WHERE name = 'Electrical Parts';
  SELECT id INTO transmission_cat_id FROM public.categories WHERE name = 'Transmission Parts';
  SELECT id INTO cooling_cat_id FROM public.categories WHERE name = 'Cooling System';
  SELECT id INTO fuel_cat_id FROM public.categories WHERE name = 'Fuel System';
  SELECT id INTO brake_cat_id FROM public.categories WHERE name = 'Brake Parts';
  SELECT id INTO implements_cat_id FROM public.categories WHERE name = 'Implements';
  SELECT id INTO wheels_cat_id FROM public.categories WHERE name = 'Wheels & Tires';

  -- =====================================================
  -- INSERT COMPREHENSIVE SAMPLE PRODUCTS
  -- =====================================================

  INSERT INTO public.spare_parts (
    vendor_id, category_id, name, description, part_number, oem_part_number,
    brand, price, condition, availability_status, stock_quantity, min_stock_level,
    images, technical_specs, compatibility, warranty, featured, tags, is_active
  ) VALUES
  
  -- Engine Parts (Vendor 1)
  (
    vendor1_id, engine_cat_id,
    'John Deere Engine Oil Filter',
    'Genuine John Deere engine oil filter for optimal engine protection and performance. High-quality filtration media ensures clean oil circulation and extends engine life.',
    'RE504836', 'RE504836',
    'John Deere', 45.99, 'new', 'in_stock', 150, 25,
    ARRAY['/src/assets/tractor-plowing.jpg'],
    '{"filterType": "Spin-on", "threadSize": "3/4-16 UNF", "height": "4.5 inches", "diameter": "3.66 inches", "micronRating": "25 micron", "bypassValve": "Yes"}'::jsonb,
    ARRAY['6M Series', '7R Series', '8R Series', '6068 Engine', '6090 Engine'],
    '12 months', true,
    ARRAY['genuine', 'oem', 'filter', 'engine', 'oil'], true
  ),
  (
    vendor1_id, engine_cat_id,
    'Air Filter Element Premium',
    'High-efficiency air filter element for diesel engines. Synthetic media provides superior filtration and longer service life.',
    'AR103033', 'AR103033',
    'John Deere', 89.50, 'new', 'in_stock', 75, 15,
    ARRAY['/src/assets/farmer-tractor.jpg'],
    '{"filterType": "Panel", "length": "12.5 inches", "width": "8.5 inches", "height": "2.5 inches", "efficiency": "99.5%", "material": "Synthetic media"}'::jsonb,
    ARRAY['5E Series', '6M Series', '6R Series', '7R Series'],
    '12 months', true,
    ARRAY['air filter', 'engine', 'genuine', 'performance'], true
  ),
  (
    vendor1_id, engine_cat_id,
    'Fuel Filter Water Separator',
    'Advanced fuel filter with water separator for diesel engines. Removes water and contaminants to protect injection system.',
    'RE62418', 'RE62418',
    'John Deere', 125.00, 'new', 'in_stock', 45, 10,
    ARRAY['/src/assets/hero-combine.jpg'],
    '{"filterType": "Fuel/Water Separator", "micronRating": "10 micron", "waterCapacity": "6 oz", "flowRate": "45 GPH", "drainValve": "Manual"}'::jsonb,
    ARRAY['7R Series', '8R Series', '9R Series'],
    '12 months', false,
    ARRAY['fuel filter', 'water separator', 'diesel', 'protection'], true
  ),
  (
    vendor1_id, engine_cat_id,
    'Engine Gasket Set Complete',
    'Complete engine gasket set for 6-cylinder engines. Includes all necessary seals and gaskets for engine rebuild.',
    'RE508202', 'RE508202',
    'John Deere', 285.00, 'new', 'in_stock', 25, 5,
    ARRAY['/src/assets/irrigation-aerial.jpg'],
    '{"engineType": "6-cylinder", "material": "Multi-layer steel", "kitContents": "Head gasket, manifold gaskets, valve cover gaskets, seals", "torqueSpec": "See manual"}'::jsonb,
    ARRAY['6068 Engine', '6090 Engine', '6135 Engine'],
    '24 months', true,
    ARRAY['gasket', 'engine', 'complete set', 'rebuild'], true
  ),
  (
    vendor1_id, engine_cat_id,
    'Turbocharger Assembly',
    'Variable geometry turbocharger assembly for diesel engines. Increases power and efficiency while reducing emissions.',
    'RE519626', 'RE519626',
    'John Deere', 1850.00, 'new', 'in_stock', 8, 2,
    ARRAY['/src/assets/planter-seeding.jpg'],
    '{"type": "Variable geometry", "maxBoost": "25 PSI", "oilCooled": "Yes", "wastegate": "Electronic", "compressorWheel": "Aluminum"}'::jsonb,
    ARRAY['6068 Engine', '6090 Engine', '6135 Engine'],
    '24 months', true,
    ARRAY['turbo', 'engine', 'performance', 'variable geometry'], true
  ),

  -- Hydraulic Parts (Vendor 1)
  (
    vendor1_id, hydraulic_cat_id,
    'Hydraulic Pump Assembly',
    'High-performance hydraulic pump assembly for agricultural equipment. Provides reliable hydraulic power for implements and steering.',
    'PGP511A0280', 'PGP511A0280',
    'Parker', 850.00, 'new', 'in_stock', 25, 5,
    ARRAY['/src/assets/tractor-wheel.jpg'],
    '{"displacement": "28 cc/rev", "maxPressure": "3000 PSI", "maxSpeed": "3000 RPM", "mounting": "SAE A 2-bolt", "portSize": "1/2 inch"}'::jsonb,
    ARRAY['Case IH Magnum', 'New Holland T7', 'John Deere 7R'],
    '24 months', true,
    ARRAY['hydraulic', 'pump', 'high pressure', 'reliable'], true
  ),
  (
    vendor1_id, hydraulic_cat_id,
    'Hydraulic Cylinder 3" Bore',
    'Heavy-duty hydraulic cylinder with 3-inch bore. Chrome-plated rod for durability and corrosion resistance.',
    'HYD-CYL-001', NULL,
    'Parker', 285.00, 'new', 'in_stock', 35, 8,
    ARRAY['/src/assets/tractor-plowing.jpg'],
    '{"bore": "3 inches", "stroke": "12 inches", "rodDiameter": "1.5 inches", "workingPressure": "2500 PSI", "mounting": "Clevis"}'::jsonb,
    ARRAY['Universal fit', 'Most tractors', 'Loader applications'],
    '18 months', false,
    ARRAY['hydraulic', 'cylinder', 'universal', 'heavy duty'], true
  ),
  (
    vendor1_id, hydraulic_cat_id,
    'Hydraulic Hose Assembly',
    'High-pressure hydraulic hose with JIC fittings. Suitable for most agricultural applications with excellent flexibility.',
    'HYD-HOSE-001', NULL,
    'Parker', 35.00, 'new', 'in_stock', 200, 50,
    ARRAY['/src/assets/farmer-tractor.jpg'],
    '{"innerDiameter": "1/2 inch", "length": "36 inches", "workingPressure": "3000 PSI", "fittingType": "JIC", "temperature": "-40°F to +212°F"}'::jsonb,
    ARRAY['Universal'],
    '12 months', false,
    ARRAY['hydraulic', 'hose', 'universal', 'high pressure', 'flexible'], true
  ),

  -- Electrical Parts (Vendor 2)
  (
    vendor2_id, electrical_cat_id,
    'Alternator 12V 95A Heavy Duty',
    'Heavy-duty alternator for Case IH tractors and combines. 12V output, 95 amp capacity with internal voltage regulator.',
    '87540915', '87540915',
    'Case IH', 285.00, 'new', 'in_stock', 20, 5,
    ARRAY['/src/assets/hero-combine.jpg'],
    '{"voltage": "12V", "amperage": "95A", "rotation": "Clockwise", "mounting": "Pad mount", "regulator": "Internal"}'::jsonb,
    ARRAY['Magnum Series', 'Puma Series', 'Farmall Series'],
    '18 months', true,
    ARRAY['electrical', 'alternator', 'charging', 'heavy duty'], true
  ),
  (
    vendor2_id, electrical_cat_id,
    'Ignition Switch Assembly',
    'Complete ignition switch assembly with keys. Universal fit for most agricultural equipment with weather-resistant design.',
    'SW-001-12V', NULL,
    'Universal', 45.00, 'new', 'in_stock', 80, 20,
    ARRAY['/src/assets/irrigation-aerial.jpg'],
    '{"voltage": "12V", "positions": "4 position", "terminals": "6 terminal", "keyCount": "2 keys included", "weatherSealing": "IP65"}'::jsonb,
    ARRAY['Universal fit'],
    '12 months', false,
    ARRAY['electrical', 'ignition', 'switch', 'universal', 'weather resistant'], true
  ),
  (
    vendor2_id, electrical_cat_id,
    'Starter Motor Heavy Duty',
    'Heavy-duty starter motor for diesel engines. High torque for reliable starting in all weather conditions.',
    'STARTER-12V', NULL,
    'Bosch', 320.00, 'new', 'in_stock', 18, 5,
    ARRAY['/src/assets/planter-seeding.jpg'],
    '{"voltage": "12V", "power": "4.0 kW", "teeth": "10 teeth", "rotation": "Clockwise", "solenoid": "Integrated"}'::jsonb,
    ARRAY['Most diesel tractors', 'Heavy equipment'],
    '18 months', false,
    ARRAY['starter', 'electrical', 'diesel', 'heavy duty'], true
  ),

  -- Transmission Parts (Vendor 1)
  (
    vendor1_id, transmission_cat_id,
    'Transmission Filter Kit',
    'Complete transmission filter kit including gaskets and seals. Essential for transmission maintenance and longevity.',
    'RE234567', 'RE234567',
    'John Deere', 125.00, 'new', 'in_stock', 40, 10,
    ARRAY['/src/assets/tractor-wheel.jpg'],
    '{"kitContents": "Filter, gasket, seals, O-rings", "filterType": "Spin-on", "capacity": "12 quarts", "micronRating": "25 micron"}'::jsonb,
    ARRAY['7R Series', '8R Series', 'PowerShift transmission'],
    '12 months', false,
    ARRAY['transmission', 'filter', 'kit', 'genuine', 'maintenance'], true
  ),
  (
    vendor1_id, transmission_cat_id,
    'Clutch Disc Assembly',
    'Heavy-duty clutch disc for manual transmission tractors. Organic friction material for smooth engagement.',
    'CLUTCH-DISC-001', NULL,
    'Sachs', 185.00, 'new', 'in_stock', 28, 8,
    ARRAY['/src/assets/tractor-plowing.jpg'],
    '{"diameter": "11 inches", "splineCount": "10 spline", "splineDiameter": "1.5 inches", "material": "Organic friction"}'::jsonb,
    ARRAY['Manual transmission tractors'],
    '12 months', false,
    ARRAY['clutch', 'transmission', 'manual'], true
  ),

  -- Cooling System Parts (Vendor 2)
  (
    vendor2_id, cooling_cat_id,
    'Radiator Assembly',
    'High-quality radiator assembly for Kubota tractors. Aluminum core with plastic tanks for optimal heat dissipation.',
    '1C010-17114', '1C010-17114',
    'Kubota', 420.00, 'new', 'in_stock', 15, 5,
    ARRAY['/src/assets/farmer-tractor.jpg'],
    '{"coreType": "Aluminum", "tankMaterial": "Plastic", "rows": "2 row", "inletSize": "1.5 inches", "outletSize": "1.5 inches"}'::jsonb,
    ARRAY['M Series', 'L Series', 'Grand L Series'],
    '12 months', false,
    ARRAY['cooling', 'radiator', 'aluminum', 'heat dissipation'], true
  ),
  (
    vendor2_id, cooling_cat_id,
    'Engine Thermostat 180°F',
    'Engine thermostat for optimal operating temperature. 180°F opening temperature with housing included.',
    'THERMOSTAT-001', NULL,
    'Gates', 35.00, 'new', 'in_stock', 95, 25,
    ARRAY['/src/assets/hero-combine.jpg'],
    '{"openingTemp": "180°F", "diameter": "2 inches", "type": "Wax pellet", "housing": "Included"}'::jsonb,
    ARRAY['Most diesel engines'],
    '12 months', false,
    ARRAY['thermostat', 'cooling', 'temperature'], true
  ),

  -- Fuel System Parts (Vendor 1)
  (
    vendor1_id, fuel_cat_id,
    'Fuel Injection Pump Remanufactured',
    'Remanufactured fuel injection pump for Massey Ferguson tractors. Core exchange required. Precision-calibrated for optimal performance.',
    '3641832M91', '3641832M91',
    'Massey Ferguson', 1250.00, 'refurbished', 'in_stock', 8, 2,
    ARRAY['/src/assets/irrigation-aerial.jpg'],
    '{"type": "Rotary", "cylinders": "4 cylinder", "rotation": "Clockwise", "coreRequired": "Yes", "calibration": "Factory tested"}'::jsonb,
    ARRAY['MF 6400', 'MF 7400', 'MF 8400'],
    '12 months', true,
    ARRAY['fuel system', 'injection pump', 'remanufactured', 'precision'], true
  ),
  (
    vendor1_id, fuel_cat_id,
    'Electric Fuel Pump',
    'Electric fuel pump for diesel fuel systems. In-tank or inline mounting with high flow capacity.',
    'FUEL-PUMP-001', NULL,
    'Bosch', 165.00, 'new', 'in_stock', 32, 10,
    ARRAY['/src/assets/planter-seeding.jpg'],
    '{"voltage": "12V", "pressure": "45 PSI", "flowRate": "120 LPH", "mounting": "In-tank/Inline"}'::jsonb,
    ARRAY['Modern diesel tractors'],
    '12 months', false,
    ARRAY['fuel pump', 'electric', 'diesel'], true
  ),

  -- Brake Parts (Vendor 2)
  (
    vendor2_id, brake_cat_id,
    'Brake Pad Set Ceramic',
    'High-performance brake pads for Fendt tractors. Ceramic compound for long life and quiet operation.',
    'F916200060110', 'F916200060110',
    'Fendt', 95.00, 'new', 'in_stock', 60, 15,
    ARRAY['/src/assets/tractor-wheel.jpg'],
    '{"material": "Ceramic compound", "thickness": "15mm", "length": "120mm", "width": "80mm", "temperature": "Up to 800°F"}'::jsonb,
    ARRAY['Fendt 700', 'Fendt 800', 'Fendt 900'],
    '6 months', false,
    ARRAY['brake', 'ceramic', 'long life', 'quiet'], true
  ),
  (
    vendor2_id, brake_cat_id,
    'Air Compressor Assembly',
    'Single cylinder air compressor for air brake systems. Belt driven with heavy-duty construction.',
    'AIR-COMPRESSOR-001', NULL,
    'Bendix', 485.00, 'new', 'in_stock', 8, 2,
    ARRAY['/src/assets/farmer-tractor.jpg'],
    '{"displacement": "16.8 cubic inches", "maxPressure": "150 PSI", "drive": "Belt driven", "cylinders": "1"}'::jsonb,
    ARRAY['Air brake tractors'],
    '18 months', false,
    ARRAY['air compressor', 'brake', 'pneumatic'], true
  ),

  -- Implements (Vendor 1)
  (
    vendor1_id, implements_cat_id,
    'Plow Share 16" Hardened Steel',
    'Heavy-duty plow share for 16-inch plows. Hardened steel construction for extended wear life in tough soil conditions.',
    'PLOW-SHARE-001', NULL,
    'Generic', 85.00, 'new', 'in_stock', 45, 15,
    ARRAY['/src/assets/tractor-plowing.jpg'],
    '{"width": "16 inches", "material": "Hardened steel", "thickness": "12mm", "mounting": "Bolt-on", "hardness": "HRC 45-50"}'::jsonb,
    ARRAY['16" plows', 'Most moldboard plows'],
    '6 months', false,
    ARRAY['plow', 'share', 'hardened steel', 'wear resistant'], true
  ),
  (
    vendor1_id, implements_cat_id,
    'Disc Harrow Blade 20"',
    'Premium disc harrow blade with notched edge for aggressive cutting action. Heat-treated for durability.',
    'DISC-BLADE-001', NULL,
    'Generic', 65.00, 'new', 'in_stock', 120, 30,
    ARRAY['/src/assets/hero-combine.jpg'],
    '{"diameter": "20 inches", "thickness": "6mm", "holeSize": "1.5 inches", "edge": "Notched", "material": "Heat-treated steel"}'::jsonb,
    ARRAY['Most disc harrows', 'Tandem disc'],
    '6 months', false,
    ARRAY['disc', 'harrow', 'blade', 'notched', 'heat treated'], true
  ),

  -- Wheels & Tires (Vendor 2)
  (
    vendor2_id, wheels_cat_id,
    'Front Tire 12.4-24 R1',
    'Front tractor tire with R-1 tread pattern. Excellent traction and durability for field operations.',
    'TIRE-FRONT-001', NULL,
    'Firestone', 285.00, 'new', 'in_stock', 20, 5,
    ARRAY['/src/assets/irrigation-aerial.jpg'],
    '{"size": "12.4-24", "treadPattern": "R-1", "plyRating": "8 PR", "rimSize": "24 inch", "loadIndex": "121"}'::jsonb,
    ARRAY['Medium tractors', '75-100 HP'],
    '12 months', false,
    ARRAY['tire', 'front', 'traction', 'R1 pattern'], true
  ),

  -- Out of Stock Items for Testing
  (
    vendor1_id, engine_cat_id,
    'Premium Engine Rebuild Kit',
    'Complete engine rebuild kit with pistons, rings, gaskets, and bearings. Currently out of stock - pre-order available.',
    'ENGINE-REBUILD-001', NULL,
    'Mahle', 2450.00, 'new', 'out_of_stock', 0, 2,
    ARRAY['/src/assets/planter-seeding.jpg'],
    '{"cylinders": "6 cylinder kit", "bore": "Standard", "compression": "17:1", "material": "Premium components"}'::jsonb,
    ARRAY['6068 Engine', '6090 Engine'],
    '24 months', true,
    ARRAY['engine', 'rebuild', 'complete kit', 'premium'], true
  ),

  -- Inactive Product for Testing
  (
    vendor2_id, electrical_cat_id,
    'Legacy Wiring Harness',
    'Legacy wiring harness for older tractor models. Discontinued but available for existing customers.',
    'WIRING-LEGACY-001', NULL,
    'Universal', 125.00, 'used', 'discontinued', 5, 1,
    ARRAY['/src/assets/tractor-wheel.jpg'],
    '{"voltage": "12V", "length": "20 feet", "connectors": "Various", "condition": "Good"}'::jsonb,
    ARRAY['Older tractor models'],
    '6 months', false,
    ARRAY['wiring', 'harness', 'legacy', 'discontinued'], false
  )

  ON CONFLICT (part_number) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price = EXCLUDED.price,
    stock_quantity = EXCLUDED.stock_quantity,
    availability_status = EXCLUDED.availability_status,
    updated_at = NOW();

END $$;

-- =====================================================
-- INSERT COMPANY PARTNERS
-- =====================================================

INSERT INTO public.company_partners (name, logo_url, website_url, description, display_order, is_active) VALUES
  ('John Deere', '/company logos/John_Deere-Logo-PNG3.png', 'https://www.deere.com', 'Leading manufacturer of agricultural machinery and equipment', 1, true),
  ('Case IH', '/company logos/IH_logo_PNG_(3).png', 'https://www.caseih.com', 'Agricultural equipment manufacturer specializing in tractors and combines', 2, true),
  ('New Holland', '/company logos/New_Holland_logo_PNG_(7).png', 'https://www.newholland.com', 'Global agricultural machinery and equipment manufacturer', 3, true),
  ('Kubota', '/company logos/Kubota_(1).png', 'https://www.kubota.com', 'Compact tractors and agricultural equipment specialist', 4, true),
  ('Massey Ferguson', '/company logos/Massey-Ferguson-Logo.png', 'https://www.masseyferguson.com', 'Agricultural machinery manufacturer with global presence', 5, true)
ON CONFLICT (name) DO UPDATE SET
  logo_url = EXCLUDED.logo_url,
  website_url = EXCLUDED.website_url,
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  updated_at = NOW();

-- =====================================================
-- CREATE SAMPLE ADVERTISEMENTS
-- =====================================================

INSERT INTO public.ads (vendor_id, title, description, image_url, target_url, ad_type, is_active) VALUES
  (
    (SELECT id FROM public.user_profiles WHERE email = 'vendor1@massrides.co.zm'),
    'Premium Engine Parts Sale',
    'Get 20% off all genuine engine parts this month. Limited time offer on filters, gaskets, and turbochargers!',
    '/src/assets/tractor-plowing.jpg',
    '/catalog?category=Engine+Parts',
    'banner',
    true
  ),
  (
    (SELECT id FROM public.user_profiles WHERE email = 'vendor2@massrides.co.zm'),
    'Hydraulic System Special',
    'Complete hydraulic system overhaul packages available. Expert installation and technical support included.',
    '/src/assets/farmer-tractor.jpg',
    '/catalog?category=Hydraulic+Parts',
    'featured',
    true
  ),
  (
    (SELECT id FROM public.user_profiles WHERE email = 'vendor1@massrides.co.zm'),
    'Electrical Components Clearance',
    'Clearance sale on electrical components. Alternators, starters, and switches at reduced prices.',
    '/src/assets/hero-combine.jpg',
    '/catalog?category=Electrical+Parts',
    'sponsored',
    true
  )
ON CONFLICT DO NOTHING;

-- =====================================================
-- VERIFY DATA INTEGRITY
-- =====================================================

-- Update product availability based on stock
UPDATE public.spare_parts 
SET availability_status = CASE 
  WHEN stock_quantity = 0 THEN 'out_of_stock'
  WHEN stock_quantity <= min_stock_level THEN 'in_stock'
  ELSE 'in_stock'
END
WHERE availability_status != 'discontinued';

-- Ensure all products have proper categories
UPDATE public.spare_parts 
SET category_id = (SELECT id FROM public.categories WHERE name = 'Engine Parts' LIMIT 1)
WHERE category_id IS NULL;

-- Ensure all products have vendors
UPDATE public.spare_parts 
SET vendor_id = (SELECT id FROM public.user_profiles WHERE role = 'vendor' LIMIT 1)
WHERE vendor_id IS NULL;

-- =====================================================
-- CREATE SAMPLE USER SETTINGS
-- =====================================================

-- Create default settings for existing users
INSERT INTO public.user_settings (
  user_id, email_notifications, push_notifications, marketing_emails, 
  order_updates, theme, language, currency, timezone
)
SELECT 
  id, true, true, false, true, 'system', 'en', 'USD', 'Africa/Lusaka'
FROM public.user_profiles
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_settings WHERE user_settings.user_id = user_profiles.id
)
ON CONFLICT (user_id) DO NOTHING;