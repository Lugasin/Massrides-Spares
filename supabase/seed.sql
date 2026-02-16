-- Seed Data for Products and Inventory based on products.ts
-- This script ensures categories exist and then inserts products and inventory 
-- It uses a system vendor linked to a user profile

-- 1. Ensure Categories exist (Idempotent)
INSERT INTO categories (name, slug, description, is_active)
VALUES
 ('Engine Parts', 'engine-parts', 'Parts for engines', true),
 ('Hydraulic Parts', 'hydraulic-parts', 'Pumps and hoses', true),
 ('Electrical Parts', 'electrical-parts', 'Wiring and sensors', true),
 ('Transmission Parts', 'transmission_parts', 'Gearboxes', true),
 ('Cooling System', 'cooling-system', 'Radiators', true),
 ('Fuel System', 'fuel-system', 'Fuel pumps and injectors', true),
 ('Brake Parts', 'brake-parts', 'Brake pads and discs', true),
 ('Steering Parts', 'steering-parts', 'Steering wheels and columns', true),
 ('Cabin Parts', 'cabin-parts', 'Seats and interior', true),
 ('Implements', 'implements', 'Plows and harrows', true),
 ('Wheels & Tires', 'wheels-tires', 'Tires and rims', true),
 ('Drivetrain Parts', 'drivetrain-parts', 'Shafts and axles', true),
 ('Cab & Body', 'cab-body', 'Cab and body parts', true)
ON CONFLICT (slug) DO NOTHING;

-- 2. Insert Products and Inventory
DO $$
DECLARE
  v_user_id uuid;
  v_cat_id bigint;
  v_product_id bigint;
BEGIN
  -- A. Create a Seed User/Vendor
  -- We need a UUID for the vendor_id. In a real scenario, this links to auth.users.
  -- For seeding, we'll try to find an existing user or create a placeholder in user_profiles.
  -- Ideally, we shouldn't insert into auth.users directly without the auth api, but for local dev we can grab the first user
  
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  
  -- If no user exists, we might fail or need to create one. 
  -- IF v_user_id IS NULL, we can try to insert into user_profiles directly if foreign key allows (it usually points to auth.users).
  -- So we assume at least one user exists after migration/setup or strict RLS might block us.
  -- However, for 'db reset', the auth.users is empty unless seeded.
  -- Let's create a dummy user in auth.users if none exists (only works if we have privileges, which seed.sql usually does).
  
  IF v_user_id IS NULL THEN
     v_user_id := gen_random_uuid();
     INSERT INTO auth.users (id, email)
     VALUES (v_user_id, 'system@massrides.co.zm');
  END IF;

  -- Ensure profile exists
  INSERT INTO public.user_profiles (id, first_name, last_name, role)
  VALUES (v_user_id, 'Massrides', 'System', 'vendor')
  ON CONFLICT (id) DO UPDATE SET role = 'vendor';

  -- B. Insert Products

  -- 1. John Deere Engine Oil Filter
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'engine-parts';
  INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'RE504836', 'John Deere Engine Oil Filter', 'Genuine John Deere engine oil filter for optimal engine protection and performance.', 45.00, 'USD', true, v_cat_id, 
  '{"brand": "John Deere", "compatibility": ["6M Series", "7R Series", "8R Series"], "warranty": "12 months", "specs": ["OEM Quality", "High Filtration", "Long Life", "Easy Installation"], "featured": true}'::jsonb, 
  '/assets/products/engine_oil_filter.png', 125)
  RETURNING id INTO v_product_id;
  
  INSERT INTO inventory (product_id, vendor_id, quantity, location)
  VALUES (v_product_id, v_user_id, 125, 'Warehouse A');

  -- 2. Hydraulic Pump Assembly
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'hydraulic-parts';
  INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'PGP511A0280', 'Hydraulic Pump Assembly', 'High-performance hydraulic pump assembly for agricultural equipment.', 850.00, 'USD', true, v_cat_id, 
  '{"brand": "Parker", "compatibility": ["Case IH", "New Holland", "John Deere"], "warranty": "24 months", "specs": ["High Pressure", "Durable", "OEM Replacement", "2 Year Warranty"], "featured": true}'::jsonb, 
  '/assets/products/hydraulic_pump.png', 25)
  RETURNING id INTO v_product_id;

  INSERT INTO inventory (product_id, vendor_id, quantity, location)
  VALUES (v_product_id, v_user_id, 25, 'Warehouse B');

  -- 3. Alternator 12V 95A
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'electrical-parts';
  INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, '87540915', 'Alternator 12V 95A', 'Heavy-duty alternator for Case IH tractors and combines.', 285.00, 'USD', true, v_cat_id, 
  '{"brand": "Case IH", "compatibility": ["Magnum Series", "Puma Series", "Farmall Series"], "warranty": "18 months", "specs": ["12V Output", "95 Amp", "Heavy Duty", "Weather Resistant"], "featured": true}'::jsonb, 
  '/assets/products/tractor_alternator.png', 20)
  RETURNING id INTO v_product_id;

  INSERT INTO inventory (product_id, vendor_id, quantity, location)
  VALUES (v_product_id, v_user_id, 20, 'Warehouse B');

  -- 4. Radiator Assembly
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'cooling-system';
  INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, '1C010-17114', 'Radiator Assembly', 'High-quality radiator assembly for Kubota tractors.', 420.00, 'USD', true, v_cat_id, 
  '{"brand": "Kubota", "compatibility": ["M Series", "L Series", "Grand L Series"], "warranty": "12 months", "specs": ["Aluminum Core", "Plastic Tank", "OEM Fit", "Pressure Tested"], "featured": false}'::jsonb, 
  '/assets/products/radiator_assembly.png', 15)
  RETURNING id INTO v_product_id;

  INSERT INTO inventory (product_id, vendor_id, quantity, location)
  VALUES (v_product_id, v_user_id, 15, 'Warehouse B');

  -- 5. Fuel Injection Pump
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'fuel-system';
  INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, '3641832M91', 'Fuel Injection Pump', 'Remanufactured fuel injection pump for Massey Ferguson tractors.', 1250.00, 'USD', true, v_cat_id, 
  '{"brand": "Massey Ferguson", "compatibility": ["MF 6400", "MF 7400", "MF 8400"], "warranty": "12 months", "specs": ["High Precision", "Rebuilt", "Tested", "Core Exchange"], "featured": false}'::jsonb, 
  '/assets/products/fuel_injection_pump.png', 8)
  RETURNING id INTO v_product_id;

  INSERT INTO inventory (product_id, vendor_id, quantity, location)
  VALUES (v_product_id, v_user_id, 8, 'Warehouse B');

  -- 6. Brake Pad Set
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'brake-parts';
  INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'F916200060110', 'Brake Pad Set', 'High-performance brake pads for Fendt tractors.', 95.00, 'USD', true, v_cat_id, 
  '{"brand": "Fendt", "compatibility": ["Fendt 700", "Fendt 800", "Fendt 900"], "warranty": "6 months", "specs": ["Ceramic Compound", "Low Dust", "Quiet Operation", "Long Lasting"], "featured": false}'::jsonb, 
  '/assets/products/brake_pad_set.png', 60)
  RETURNING id INTO v_product_id;

  INSERT INTO inventory (product_id, vendor_id, quantity, location)
  VALUES (v_product_id, v_user_id, 60, 'Warehouse A');

  -- 7. LED Work Light
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'electrical-parts';
  INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'LED-WL48S', 'LED Work Light', 'High-intensity LED work light for night operations. Durable and weather-resistant.', 45.00, 'USD', true, v_cat_id, 
  '{"brand": "Massrides", "compatibility": ["Universal Tractor Fit", "Combine Harvesters"], "warranty": "12 months", "specs": ["48W LED", "Flood Beam", "IP67 Waterproof", "Universal Mount"], "featured": false}'::jsonb, 
  '/assets/products/tractor_headlight.png', 100)
  RETURNING id INTO v_product_id;

  INSERT INTO inventory (product_id, vendor_id, quantity, location)
  VALUES (v_product_id, v_user_id, 100, 'Warehouse C');

  -- 8. PTO Shaft Guard
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'drivetrain-parts';
  INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'PTO-G100', 'PTO Shaft Guard', 'Essential safety guard for agricultural PTO shafts. Protects operators from entanglement.', 65.00, 'USD', true, v_cat_id, 
  '{"brand": "Weasler", "compatibility": ["Series 1-4 PTO Shafts"], "warranty": "6 months", "specs": ["Safety Yellow", "Durable Plastic", "Universal Fit", "Easy Install"], "featured": false}'::jsonb, 
  '/assets/products/pto_shaft.png', 45)
  RETURNING id INTO v_product_id;
  
  INSERT INTO inventory (product_id, vendor_id, quantity, location)
  VALUES (v_product_id, v_user_id, 45, 'Warehouse A');

  -- 9. Combine Air Filter
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'engine-parts';
  INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'P181052', 'Combine Air Filter', 'Primary engine air filter for large combine harvesters. Ensures clean air for maximum power.', 78.00, 'USD', true, v_cat_id, 
  '{"brand": "Donaldson", "compatibility": ["John Deere S Series", "Case IH Axial-Flow"], "warranty": "N/A", "specs": ["Heavy Duty", "High Capacity", "Dual Seal", "Extended Life"], "featured": true}'::jsonb, 
  '/assets/products/air_filter_combine.png', 30)
  RETURNING id INTO v_product_id;

  INSERT INTO inventory (product_id, vendor_id, quantity, location)
  VALUES (v_product_id, v_user_id, 30, 'Warehouse B');

  -- 10. Suspension Seat
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'cab-body'; -- Using cab-body from slug list
  INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'MSG85/721', 'Suspension Seat', 'Comfortable mechanical suspension seat to reduce operator fatigue during long days.', 350.00, 'USD', true, v_cat_id, 
  '{"brand": "Grammer", "compatibility": ["Universal Flat Mount", "Massey Ferguson", "New Holland"], "warranty": "12 months", "specs": ["Adjustable Suspension", "Armrests", "Fabric Cover", "Ergonomic"], "featured": false}'::jsonb, 
  '/assets/products/tractor_seat.png', 10)
  RETURNING id INTO v_product_id;

  INSERT INTO inventory (product_id, vendor_id, quantity, location)
  VALUES (v_product_id, v_user_id, 10, 'Warehouse B');

  -- 11. Tractor Clutch Kit
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'transmission_parts';
  INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, '628302009', 'Tractor Clutch Kit', 'Complete clutch replacement kit for reliable power transmission.', 480.00, 'USD', true, v_cat_id, 
  '{"brand": "LuK", "compatibility": ["Ford New Holland", "Fiat Agri"], "warranty": "12 months", "specs": ["Pressure Plate", "Clutch Disc", "Release Bearing", "Alignment Tool"], "featured": false}'::jsonb, 
  '/assets/products/clutch_kit.png', 12)
  RETURNING id INTO v_product_id;

  INSERT INTO inventory (product_id, vendor_id, quantity, location)
  VALUES (v_product_id, v_user_id, 12, 'Warehouse A');

  -- Used Parts
  -- 12. Used Transmission Assembly
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'transmission_parts';
  INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'RE234567-U', 'Used Transmission Assembly', 'Remanufactured transmission assembly from John Deere 7R series.', 2500.00, 'USD', true, v_cat_id, 
  '{"brand": "John Deere", "compatibility": ["7R Series", "8R Series"], "warranty": "6 months", "specs": ["Rebuilt", "Tested", "6 Month Warranty", "Core Required"], "featured": false, "condition": "Refurbished", "originalEquipment": "John Deere 7R 290"}'::jsonb, 
  '/assets/products/transmission_assembly.png', 1)
  RETURNING id INTO v_product_id;

  INSERT INTO inventory (product_id, vendor_id, quantity, location)
  VALUES (v_product_id, v_user_id, 1, 'Warehouse B');

  -- 13. Used Hydraulic Cylinder
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'hydraulic-parts';
  INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, '87540123-U', 'Used Hydraulic Cylinder', 'Resealed hydraulic cylinder from Case IH Magnum tractor.', 450.00, 'USD', true, v_cat_id, 
  '{"brand": "Case IH", "compatibility": ["Magnum Series", "Puma Series"], "warranty": "3 months", "specs": ["Resealed", "Pressure Tested", "90 Day Warranty"], "featured": false, "condition": "Used", "originalEquipment": "Case IH Magnum 340"}'::jsonb, 
  '/assets/products/hydraulic_cylinder.png', 2)
  RETURNING id INTO v_product_id;

  INSERT INTO inventory (product_id, vendor_id, quantity, location)
  VALUES (v_product_id, v_user_id, 2, 'Warehouse B');

END $$;
