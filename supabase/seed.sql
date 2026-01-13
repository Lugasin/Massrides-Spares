-- Seed Data for Products and Inventory based on user input
-- This script ensures categories exist and then inserts products and inventory 

-- Ensure Categories exist (Idempotent)
INSERT INTO categories (name, slug, description, is_active)
VALUES
 ('Engine Parts', 'engine-parts', 'Parts for engines', true),
 ('Hydraulic Parts', 'hydraulic-parts', 'Pumps and hoses', true),
 ('Electrical Parts', 'electrical-parts', 'Wiring and sensors', true),
 ('Transmission Parts', 'transmission-parts', 'Gearboxes', true),
 ('Cooling System', 'cooling-system', 'Radiators', true),
 ('Fuel System', 'fuel-system', 'Fuel pumps and injectors', true),
 ('Brake Parts', 'brake-parts', 'Brake pads and discs', true),
 ('Steering Parts', 'steering-parts', 'Steering wheels and columns', true),
 ('Cabin Parts', 'cabin-parts', 'Seats and interior', true),
 ('Implements', 'implements', 'Plows and harrows', true),
 ('Wheels & Tires', 'wheels-tires', 'Tires and rims', true)
ON CONFLICT (slug) DO NOTHING;

-- Insert Products and Inventory
-- We use a DO block to look up category IDs dynamically

DO $$
DECLARE
  v_vendor_id bigint;
  v_cat_id bigint;
  v_product_id bigint;
BEGIN
  -- 1. Create a Seed Vendor if not exists (using a placeholder owner_id if needed, or null)
  -- For now, we assume a system vendor or create one.
  INSERT INTO vendors (corporate_name, slug, contact_email, is_active)
  VALUES ('Massrides Spares System', 'massrides-system', 'system@massrides.co.zm', true)
  ON CONFLICT (slug) DO UPDATE SET is_active = true
  RETURNING id INTO v_vendor_id;

  -- 2. Insert Products
  
  -- John Deere Engine Oil Filter
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'engine-parts';
  INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image)
  VALUES (v_vendor_id, 'RE504836', 'John Deere Engine Oil Filter', 'Genuine John Deere engine oil filter for optimal engine protection and performance.', 45.99, 'USD', true, v_cat_id, '{"brand": "John Deere", "compatibility": ["6M Series", "7R Series"], "warranty": "12 months"}'::jsonb, '/assets/8-8.png')
  RETURNING id INTO v_product_id;
  
  INSERT INTO inventory (product_id, vendor_id, quantity, location)
  VALUES (v_product_id, v_vendor_id, 125, 'Warehouse A');

  -- John Deere Air Filter Element
  INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image)
  VALUES (v_vendor_id, 'AR103033', 'John Deere Air Filter Element', 'Primary air filter element for John Deere tractors.', 89.50, 'USD', true, v_cat_id, '{"brand": "John Deere", "compatibility": ["5E Series", "6M Series"], "warranty": "12 months"}'::jsonb, '/assets/Newtractor.png')
  RETURNING id INTO v_product_id;

  INSERT INTO inventory (product_id, vendor_id, quantity, location)
  VALUES (v_product_id, v_vendor_id, 125, 'Warehouse A');

  -- Fuel Filter Water Separator
  INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image)
  VALUES (v_vendor_id, 'RE62418', 'Fuel Filter Water Separator', 'Fuel filter with water separator for diesel engines.', 125.00, 'USD', true, v_cat_id, '{"brand": "John Deere", "compatibility": ["7R Series"], "warranty": "12 months"}'::jsonb, '/assets/Newtractor1.png')
  RETURNING id INTO v_product_id;
  
  INSERT INTO inventory (product_id, vendor_id, quantity, location)
  VALUES (v_product_id, v_vendor_id, 125, 'Warehouse A');

  -- Hydraulic Pump Assembly
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'hydraulic-parts';
  INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image)
  VALUES (v_vendor_id, 'PGP511A0280', 'Hydraulic Pump Assembly', 'High-performance hydraulic pump assembly.', 850.00, 'USD', true, v_cat_id, '{"brand": "Parker", "compatibility": ["Case IH"], "warranty": "24 months"}'::jsonb, '/assets/pivot.png')
  RETURNING id INTO v_product_id;

  INSERT INTO inventory (product_id, vendor_id, quantity, location)
  VALUES (v_product_id, v_vendor_id, 25, 'Warehouse B');

   -- Alternator 12V 95A
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'electrical-parts';
  INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image)
  VALUES (v_vendor_id, '87540915', 'Alternator 12V 95A', 'Heavy-duty alternator for Case IH tractors.', 285.00, 'USD', true, v_cat_id, '{"brand": "Case IH", "compatibility": ["Magnum Series"], "warranty": "18 months"}'::jsonb, '/assets/Newtractor5.png')
  RETURNING id INTO v_product_id;

  INSERT INTO inventory (product_id, vendor_id, quantity, location)
  VALUES (v_product_id, v_vendor_id, 20, 'Warehouse B');

  -- Transmission Filter Kit
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'transmission-parts';
  INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image)
  VALUES (v_vendor_id, 'RE234567', 'Transmission Filter Kit', 'Complete transmission filter kit including gaskets and seals.', 125.00, 'USD', true, v_cat_id, '{"brand": "John Deere", "compatibility": ["7R Series"], "warranty": "12 months"}'::jsonb, '/assets/Newtractor7.png')
  RETURNING id INTO v_product_id;

  INSERT INTO inventory (product_id, vendor_id, quantity, location)
  VALUES (v_product_id, v_vendor_id, 40, 'Warehouse A');

   -- Radiator Assembly
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'cooling-system';
  INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image)
  VALUES (v_vendor_id, '1C010-17114', 'Radiator Assembly', 'High-quality radiator assembly for Kubota tractors.', 420.00, 'USD', true, v_cat_id, '{"brand": "Kubota", "compatibility": ["M Series"], "warranty": "12 months"}'::jsonb, '/assets/Newtractor10.png')
  RETURNING id INTO v_product_id;

  INSERT INTO inventory (product_id, vendor_id, quantity, location)
  VALUES (v_product_id, v_vendor_id, 15, 'Warehouse B');

    -- Fuel Injection Pump
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'fuel-system';
  INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image)
  VALUES (v_vendor_id, '3641832M91', 'Fuel Injection Pump', 'Remanufactured fuel injection pump for Massey Ferguson tractors.', 1250.00, 'USD', true, v_cat_id, '{"brand": "Massey Ferguson", "compatibility": ["MF 6400"], "warranty": "12 months"}'::jsonb, '/assets/Newtractor11.png')
  RETURNING id INTO v_product_id;

  INSERT INTO inventory (product_id, vendor_id, quantity, location)
  VALUES (v_product_id, v_vendor_id, 8, 'Warehouse B');

     -- Brake Pad Set
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'brake-parts';
  INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image)
  VALUES (v_vendor_id, 'F916200060110', 'Brake Pad Set', 'High-performance brake pads.', 95.00, 'USD', true, v_cat_id, '{"brand": "Fendt", "compatibility": ["Fendt 700"], "warranty": "6 months"}'::jsonb, '/assets/Harverster.jpg')
  RETURNING id INTO v_product_id;

  INSERT INTO inventory (product_id, vendor_id, quantity, location)
  VALUES (v_product_id, v_vendor_id, 60, 'Warehouse A');

       -- Steering Wheel Assembly
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'steering-parts';
  INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image)
  VALUES (v_vendor_id, 'STEER-WHEEL-001', 'Steering Wheel Assembly', 'Complete steering wheel assembly with horn button.', 145.00, 'USD', true, v_cat_id, '{"brand": "Universal", "compatibility": ["Universal"], "warranty": "12 months"}'::jsonb, '/assets/Combine.jpg')
  RETURNING id INTO v_product_id;

  INSERT INTO inventory (product_id, vendor_id, quantity, location)
  VALUES (v_product_id, v_vendor_id, 30, 'Warehouse B');

         -- Operator Seat
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'cabin-parts';
  INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image)
  VALUES (v_vendor_id, 'SEAT-SUSP-001', 'Operator Seat with Suspension', 'Comfortable operator seat with air suspension.', 650.00, 'USD', true, v_cat_id, '{"brand": "Grammer", "compatibility": ["Universal"], "warranty": "24 months"}'::jsonb, '/assets/Newtractor8.png')
  RETURNING id INTO v_product_id;

  INSERT INTO inventory (product_id, vendor_id, quantity, location)
  VALUES (v_product_id, v_vendor_id, 10, 'Warehouse B');

           -- Plow Share
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'implements';
  INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image)
  VALUES (v_vendor_id, 'PLOW-SHARE-001', 'Plow Share 16"', 'Heavy-duty plow share for 16-inch plows.', 85.00, 'USD', true, v_cat_id, '{"brand": "Generic", "compatibility": ["16 inch plows"], "warranty": "6 months"}'::jsonb, '/assets/Plough.png')
  RETURNING id INTO v_product_id;

  INSERT INTO inventory (product_id, vendor_id, quantity, location)
  VALUES (v_product_id, v_vendor_id, 100, 'Warehouse A');
  
    -- Front Tire
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'wheels-tires';
  INSERT INTO products (vendor_id, sku, title, description, price, currency, active, category_id, attributes, main_image)
  VALUES (v_vendor_id, 'TIRE-FRONT-001', 'Front Tire 12.4-24', 'Front tractor tire with R-1 tread pattern.', 285.00, 'USD', true, v_cat_id, '{"brand": "Firestone", "compatibility": ["Universal"], "warranty": "12 months"}'::jsonb, '/assets/tractor-wheel.jpg')
  RETURNING id INTO v_product_id;

  INSERT INTO inventory (product_id, vendor_id, quantity, location)
  VALUES (v_product_id, v_vendor_id, 40, 'Warehouse C');

END $$;
