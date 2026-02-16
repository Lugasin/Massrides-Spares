-- Seed Data for Massrides Spares (Dashboard Safe)
-- COPY AND PASTE THIS INTO THE SUPABASE SQL EDITOR

DO $$
DECLARE
  v_user_id uuid;
  v_cat_id bigint;
  v_product_id bigint;
BEGIN
  -- 1. Get a Vendor User (Using FIRST existing user)
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;

  IF v_user_id IS NULL THEN
     RAISE EXCEPTION 'No user found in auth.users. Please sign up a user first in your application!';
  END IF;

  -- Ensure profile exists and is a vendor
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (v_user_id, 'Massrides System', 'vendor')
  ON CONFLICT (id) DO UPDATE SET role = 'vendor';

  -- 2. Ensure Categories
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

  -- 3. Insert Products

  -- John Deere Engine Oil Filter
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'engine-parts';
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'RE504836', 'John Deere Engine Oil Filter', 'Genuine John Deere engine oil filter for optimal engine protection and performance.', 45.00, 'USD', true, v_cat_id, 
  '{"brand": "John Deere", "compatibility": ["6M Series", "7R Series", "8R Series"], "warranty": "12 months", "specs": ["OEM Quality", "High Filtration", "Long Life", "Easy Installation"], "featured": true}'::jsonb, 
  '/assets/products/engine_oil_filter.png', 125)
  ON CONFLICT DO NOTHING -- Avoid duplicates if re-run
  RETURNING id INTO v_product_id;
  
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location)
    VALUES (v_product_id, v_user_id, 125, 'Warehouse A')
    ON CONFLICT (product_id) DO UPDATE SET quantity = 125;
  END IF;

  -- Hydraulic Pump Assembly
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'hydraulic-parts';
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'PGP511A0280', 'Hydraulic Pump Assembly', 'High-performance hydraulic pump assembly for agricultural equipment.', 850.00, 'USD', true, v_cat_id, 
  '{"brand": "Parker", "compatibility": ["Case IH", "New Holland", "John Deere"], "warranty": "24 months", "specs": ["High Pressure", "Durable", "OEM Replacement", "2 Year Warranty"], "featured": true}'::jsonb, 
  '/assets/products/hydraulic_pump.png', 25)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;

  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location)
    VALUES (v_product_id, v_user_id, 25, 'Warehouse B')
    ON CONFLICT (product_id) DO UPDATE SET quantity = 25;
  END IF;

  -- Alternator 12V 95A
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'electrical-parts';
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, '87540915', 'Alternator 12V 95A', 'Heavy-duty alternator for Case IH tractors and combines.', 285.00, 'USD', true, v_cat_id, 
  '{"brand": "Case IH", "compatibility": ["Magnum Series", "Puma Series", "Farmall Series"], "warranty": "18 months", "specs": ["12V Output", "95 Amp", "Heavy Duty", "Weather Resistant"], "featured": true}'::jsonb, 
  '/assets/products/tractor_alternator.png', 20)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;

  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location)
    VALUES (v_product_id, v_user_id, 20, 'Warehouse B')
    ON CONFLICT (product_id) DO UPDATE SET quantity = 20;
  END IF;
  
  -- CONTINUE WITH OTHER PRODUCTS AS NEEDED...
  -- (Currently limiting to main ones for brevity)

END $$;
