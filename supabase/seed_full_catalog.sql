-- Full Product Catalog Seed for Massrides Spares
-- COPY AND PASTE THIS INTO THE SUPABASE SQL EDITOR
-- Merges original seed.sql products + new products across ALL categories
-- Uses correct schema columns: name (not title), is_active (not active), profiles (not user_profiles)

-- 1. Ensure Categories exist (Idempotent)
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
 ('Wheels & Tires', 'wheels-tires', 'Tires and rims', true),
 ('Drivetrain Parts', 'drivetrain-parts', 'Shafts and axles', true),
 ('Cab & Body', 'cab-body', 'Cab and body parts', true)
ON CONFLICT (slug) DO NOTHING;

-- 2. Insert All Products and Inventory
DO $$
DECLARE
  v_user_id uuid;
  v_cat_id bigint;
  v_product_id bigint;
BEGIN
  -- Get first existing user as vendor
  SELECT id INTO v_user_id FROM auth.users LIMIT 1;

  IF v_user_id IS NULL THEN
     RAISE EXCEPTION 'No user found in auth.users. Please sign up a user first!';
  END IF;

  -- Ensure profile is vendor (correct table: profiles, not user_profiles)
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (v_user_id, 'Massrides System', 'vendor')
  ON CONFLICT (id) DO UPDATE SET role = 'vendor';

  -------------------------------------------------------
  -- ENGINE PARTS
  -------------------------------------------------------
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'engine-parts';

  -- 1. John Deere Engine Oil Filter
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'RE504836', 'John Deere Engine Oil Filter', 'Genuine John Deere engine oil filter for optimal engine protection and performance.', 45.00, 'USD', true, v_cat_id,
  '{"brand": "John Deere", "compatibility": ["6M Series", "7R Series", "8R Series"], "warranty": "12 months", "specs": ["OEM Quality", "High Filtration", "Long Life", "Easy Installation"], "featured": true}'::jsonb,
  '/assets/products/engine_oil_filter.png', 125)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 125, 'Warehouse A') ON CONFLICT (product_id) DO UPDATE SET quantity = 125;
  END IF;

  -- 9. Combine Air Filter
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'P181052', 'Combine Air Filter', 'Primary engine air filter for large combine harvesters. Ensures clean air for maximum power.', 78.00, 'USD', true, v_cat_id,
  '{"brand": "Donaldson", "compatibility": ["John Deere S Series", "Case IH Axial-Flow"], "warranty": "N/A", "specs": ["Heavy Duty", "High Capacity", "Dual Seal", "Extended Life"], "featured": true}'::jsonb,
  '/assets/products/air_filter_combine.png', 30)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 30, 'Warehouse B') ON CONFLICT (product_id) DO UPDATE SET quantity = 30;
  END IF;

  -- Turbocharger Assembly
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'EP-TBT-3300', 'Turbocharger Assembly', 'Remanufactured turbocharger for high-horsepower tractors. Balanced and tested.', 1250.00, 'USD', true, v_cat_id,
  '{"brand": "Garrett", "compatibility": ["John Deere 8R", "Case IH Magnum 380"], "warranty": "12 months", "specs": ["Remanufactured", "Balanced", "Pressure Tested", "Core Exchange"], "featured": true}'::jsonb,
  '/assets/products/turbocharger.png', 3)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 3, 'Warehouse A') ON CONFLICT (product_id) DO UPDATE SET quantity = 3;
  END IF;

  -- Serpentine Belt Kit
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'EP-BLT-1100', 'Serpentine Belt Kit', 'Complete serpentine belt kit with tensioner. Premium rubber compound.', 85.00, 'USD', true, v_cat_id,
  '{"brand": "Gates", "compatibility": ["John Deere 6M", "Kubota M7", "New Holland T6"], "warranty": "12 months", "specs": ["With Tensioner", "Premium Rubber", "Temperature Resistant", "Long Life"], "featured": false}'::jsonb,
  '/assets/products/belt_kit.png', 70)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 70, 'Warehouse A') ON CONFLICT (product_id) DO UPDATE SET quantity = 70;
  END IF;

  -------------------------------------------------------
  -- HYDRAULIC PARTS
  -------------------------------------------------------
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'hydraulic-parts';

  -- 2. Hydraulic Pump Assembly
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'PGP511A0280', 'Hydraulic Pump Assembly', 'High-performance hydraulic pump assembly for agricultural equipment.', 850.00, 'USD', true, v_cat_id,
  '{"brand": "Parker", "compatibility": ["Case IH", "New Holland", "John Deere"], "warranty": "24 months", "specs": ["High Pressure", "Durable", "OEM Replacement", "2 Year Warranty"], "featured": true}'::jsonb,
  '/assets/products/hydraulic_pump.png', 25)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 25, 'Warehouse B') ON CONFLICT (product_id) DO UPDATE SET quantity = 25;
  END IF;

  -- 13. Used Hydraulic Cylinder
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, '87540123-U', 'Used Hydraulic Cylinder', 'Resealed hydraulic cylinder from Case IH Magnum tractor.', 450.00, 'USD', true, v_cat_id,
  '{"brand": "Case IH", "compatibility": ["Magnum Series", "Puma Series"], "warranty": "3 months", "specs": ["Resealed", "Pressure Tested", "90 Day Warranty"], "featured": false, "condition": "Used", "originalEquipment": "Case IH Magnum 340"}'::jsonb,
  '/assets/products/hydraulic_cylinder.png', 2)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 2, 'Warehouse B') ON CONFLICT (product_id) DO UPDATE SET quantity = 2;
  END IF;

  -- Hydraulic Hose Assembly
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'HY-HSE-1500', 'Hydraulic Hose Assembly 1/2"', 'High-pressure hydraulic hose assembly. Pre-crimped fittings. SAE 100R2.', 55.00, 'USD', true, v_cat_id,
  '{"brand": "Parker", "compatibility": ["Universal", "Most Equipment"], "warranty": "12 months", "specs": ["SAE 100R2", "1/2 Inch", "3000 PSI", "Pre-Crimped"], "featured": false}'::jsonb,
  '/assets/products/hydraulic_hose.png', 100)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 100, 'Warehouse A') ON CONFLICT (product_id) DO UPDATE SET quantity = 100;
  END IF;

  -- Hydraulic Filter Element
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'HY-FLT-800', 'Hydraulic Filter Element', 'High-efficiency hydraulic oil filter. 10 micron filtration rating.', 35.00, 'USD', true, v_cat_id,
  '{"brand": "Donaldson", "compatibility": ["Most Hydraulic Systems"], "warranty": "6 months", "specs": ["10 Micron", "High Efficiency", "Spin-On", "Easy Change"], "featured": false}'::jsonb,
  '/assets/products/hydraulic_filter.png', 150)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 150, 'Warehouse A') ON CONFLICT (product_id) DO UPDATE SET quantity = 150;
  END IF;

  -------------------------------------------------------
  -- ELECTRICAL PARTS
  -------------------------------------------------------
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'electrical-parts';

  -- 3. Alternator 12V 95A
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, '87540915', 'Alternator 12V 95A', 'Heavy-duty alternator for Case IH tractors and combines.', 285.00, 'USD', true, v_cat_id,
  '{"brand": "Case IH", "compatibility": ["Magnum Series", "Puma Series", "Farmall Series"], "warranty": "18 months", "specs": ["12V Output", "95 Amp", "Heavy Duty", "Weather Resistant"], "featured": true}'::jsonb,
  '/assets/products/tractor_alternator.png', 20)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 20, 'Warehouse B') ON CONFLICT (product_id) DO UPDATE SET quantity = 20;
  END IF;

  -- 7. LED Work Light
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'LED-WL48S', 'LED Work Light', 'High-intensity LED work light for night operations. Durable and weather-resistant.', 45.00, 'USD', true, v_cat_id,
  '{"brand": "Massrides", "compatibility": ["Universal Tractor Fit", "Combine Harvesters"], "warranty": "12 months", "specs": ["48W LED", "Flood Beam", "IP67 Waterproof", "Universal Mount"], "featured": false}'::jsonb,
  '/assets/products/tractor_headlight.png', 100)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 100, 'Warehouse C') ON CONFLICT (product_id) DO UPDATE SET quantity = 100;
  END IF;

  -- Starter Motor
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'EL-STR-4400', 'Starter Motor 12V 4.5kW', '12V starter motor for diesel engines. High torque for reliable cold starts.', 320.00, 'USD', true, v_cat_id,
  '{"brand": "Denso", "compatibility": ["John Deere", "Kubota", "Case IH"], "warranty": "18 months", "specs": ["12V", "4.5kW", "High Torque", "Gear Reduction"], "featured": true}'::jsonb,
  '/assets/products/starter_motor.png', 15)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 15, 'Warehouse A') ON CONFLICT (product_id) DO UPDATE SET quantity = 15;
  END IF;

  -- Wiring Harness
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'EL-HRN-2200', 'Wiring Harness - Main', 'Complete main wiring harness. Color coded with weather-sealed connectors.', 210.00, 'USD', true, v_cat_id,
  '{"brand": "Deutsch", "compatibility": ["John Deere 6R Series"], "warranty": "12 months", "specs": ["Color Coded", "Weather Sealed", "OEM Replacement", "Complete Set"], "featured": false}'::jsonb,
  '/assets/products/wiring_harness.png', 8)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 8, 'Warehouse A') ON CONFLICT (product_id) DO UPDATE SET quantity = 8;
  END IF;

  -------------------------------------------------------
  -- TRANSMISSION PARTS
  -------------------------------------------------------
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'transmission-parts';

  -- 11. Tractor Clutch Kit
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, '628302009', 'Tractor Clutch Kit', 'Complete clutch replacement kit for reliable power transmission.', 480.00, 'USD', true, v_cat_id,
  '{"brand": "LuK", "compatibility": ["Ford New Holland", "Fiat Agri"], "warranty": "12 months", "specs": ["Pressure Plate", "Clutch Disc", "Release Bearing", "Alignment Tool"], "featured": false}'::jsonb,
  '/assets/products/clutch_kit.png', 12)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 12, 'Warehouse A') ON CONFLICT (product_id) DO UPDATE SET quantity = 12;
  END IF;

  -- 12. Used Transmission Assembly
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'RE234567-U', 'Used Transmission Assembly', 'Remanufactured transmission assembly from John Deere 7R series.', 2500.00, 'USD', true, v_cat_id,
  '{"brand": "John Deere", "compatibility": ["7R Series", "8R Series"], "warranty": "6 months", "specs": ["Rebuilt", "Tested", "6 Month Warranty", "Core Required"], "featured": false, "condition": "Refurbished", "originalEquipment": "John Deere 7R 290"}'::jsonb,
  '/assets/products/transmission_assembly.png', 1)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 1, 'Warehouse B') ON CONFLICT (product_id) DO UPDATE SET quantity = 1;
  END IF;

  -- Gearbox Assembly
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'TR-GBX-7200', 'Gearbox Assembly 6-Speed', 'Reconditioned 6-speed gearbox assembly for medium tractors.', 2800.00, 'USD', true, v_cat_id,
  '{"brand": "ZF", "compatibility": ["Case IH Puma", "New Holland T7"], "warranty": "12 months", "specs": ["6-Speed", "Reconditioned", "Tested", "Full Warranty"], "featured": false}'::jsonb,
  '/assets/products/gearbox.png', 5)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 5, 'Warehouse B') ON CONFLICT (product_id) DO UPDATE SET quantity = 5;
  END IF;

  -------------------------------------------------------
  -- COOLING SYSTEM
  -------------------------------------------------------
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'cooling-system';

  -- 4. Radiator Assembly (from original seed)
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, '1C010-17114', 'Radiator Assembly', 'High-quality radiator assembly for Kubota tractors.', 420.00, 'USD', true, v_cat_id,
  '{"brand": "Kubota", "compatibility": ["M Series", "L Series", "Grand L Series"], "warranty": "12 months", "specs": ["Aluminum Core", "Plastic Tank", "OEM Fit", "Pressure Tested"], "featured": false}'::jsonb,
  '/assets/products/radiator_assembly.png', 15)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 15, 'Warehouse B') ON CONFLICT (product_id) DO UPDATE SET quantity = 15;
  END IF;

  -- Cooling Fan Blade
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'CS-FAN-1800', 'Cooling Fan Blade Assembly', 'Replacement cooling fan blade for tractor engines. Balanced for low vibration.', 120.00, 'USD', true, v_cat_id,
  '{"brand": "Generic", "compatibility": ["Universal Fit", "Most Tractors"], "warranty": "12 months", "specs": ["Balanced", "Low Vibration", "Durable", "Easy Install"], "featured": false}'::jsonb,
  '/assets/products/fan_blade.png', 40)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 40, 'Warehouse A') ON CONFLICT (product_id) DO UPDATE SET quantity = 40;
  END IF;

  -------------------------------------------------------
  -- FUEL SYSTEM
  -------------------------------------------------------
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'fuel-system';

  -- 5. Fuel Injection Pump (from original seed)
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, '3641832M91', 'Fuel Injection Pump', 'Remanufactured fuel injection pump for Massey Ferguson tractors.', 1250.00, 'USD', true, v_cat_id,
  '{"brand": "Massey Ferguson", "compatibility": ["MF 6400", "MF 7400", "MF 8400"], "warranty": "12 months", "specs": ["High Precision", "Rebuilt", "Tested", "Core Exchange"], "featured": false}'::jsonb,
  '/assets/products/fuel_injection_pump.png', 8)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 8, 'Warehouse B') ON CONFLICT (product_id) DO UPDATE SET quantity = 8;
  END IF;

  -- Diesel Fuel Injector Set
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'FS-INJ-5600', 'Diesel Fuel Injector Set (4pc)', 'Set of 4 precision diesel fuel injectors. Direct OEM replacement.', 380.00, 'USD', true, v_cat_id,
  '{"brand": "Bosch", "compatibility": ["John Deere 6M", "Kubota M7"], "warranty": "18 months", "specs": ["4-Piece Set", "OEM Spec", "Precision Spray", "High Flow"], "featured": true}'::jsonb,
  '/assets/products/fuel_injector.png', 30)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 30, 'Warehouse A') ON CONFLICT (product_id) DO UPDATE SET quantity = 30;
  END IF;

  -- Fuel Transfer Pump
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'FS-PMP-2200', 'Fuel Transfer Pump', 'Electric fuel transfer pump for diesel equipment. Self-priming.', 165.00, 'USD', true, v_cat_id,
  '{"brand": "Delphi", "compatibility": ["Universal", "12V Systems"], "warranty": "12 months", "specs": ["Self-Priming", "12V Electric", "High Flow Rate", "Compact"], "featured": false}'::jsonb,
  '/assets/products/fuel_pump.png', 22)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 22, 'Warehouse B') ON CONFLICT (product_id) DO UPDATE SET quantity = 22;
  END IF;

  -------------------------------------------------------
  -- BRAKE PARTS
  -------------------------------------------------------
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'brake-parts';

  -- 6. Brake Pad Set (from original seed)
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'F916200060110', 'Brake Pad Set', 'High-performance brake pads for Fendt tractors.', 95.00, 'USD', true, v_cat_id,
  '{"brand": "Fendt", "compatibility": ["Fendt 700", "Fendt 800", "Fendt 900"], "warranty": "6 months", "specs": ["Ceramic Compound", "Low Dust", "Quiet Operation", "Long Lasting"], "featured": false}'::jsonb,
  '/assets/products/brake_pad_set.png', 60)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 60, 'Warehouse A') ON CONFLICT (product_id) DO UPDATE SET quantity = 60;
  END IF;

  -- Brake Disc Rotor
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'BP-DSC-1100', 'Brake Disc Rotor', 'Ventilated brake disc rotor for combine harvesters. Heat-treated for durability.', 185.00, 'USD', true, v_cat_id,
  '{"brand": "Brembo", "compatibility": ["Case IH Axial-Flow", "New Holland CR"], "warranty": "18 months", "specs": ["Ventilated", "Heat Treated", "Precision Ground", "OEM Replacement"], "featured": false}'::jsonb,
  '/assets/products/brake_disc.png', 18)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 18, 'Warehouse B') ON CONFLICT (product_id) DO UPDATE SET quantity = 18;
  END IF;

  -------------------------------------------------------
  -- STEERING PARTS
  -------------------------------------------------------
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'steering-parts';

  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'SP-WHL-700', 'Steering Wheel with Spinner', 'Ergonomic steering wheel with integrated spinner knob. Leather wrapped.', 130.00, 'USD', true, v_cat_id,
  '{"brand": "Generic", "compatibility": ["Universal Fit", "Most Tractors"], "warranty": "12 months", "specs": ["Leather Wrapped", "Spinner Knob", "Ergonomic", "Easy Install"], "featured": false}'::jsonb,
  '/assets/products/steering_wheel.png', 35)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 35, 'Warehouse A') ON CONFLICT (product_id) DO UPDATE SET quantity = 35;
  END IF;

  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'SP-CYL-3300', 'Power Steering Cylinder', 'Hydraulic power steering cylinder. Chrome plated rod for corrosion resistance.', 340.00, 'USD', true, v_cat_id,
  '{"brand": "Parker", "compatibility": ["John Deere 6000 Series", "Case IH JX Series"], "warranty": "18 months", "specs": ["Chrome Rod", "Sealed Bearings", "High Pressure", "Leak Proof"], "featured": true}'::jsonb,
  '/assets/products/steering_cylinder.png', 10)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 10, 'Warehouse B') ON CONFLICT (product_id) DO UPDATE SET quantity = 10;
  END IF;

  -------------------------------------------------------
  -- CABIN PARTS (Seats, Lights, Interior)
  -------------------------------------------------------
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'cabin-parts';

  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'CB-LED-200', 'LED Work Light Bar 20"', 'High-output LED work light bar for tractors and combines. IP68 waterproof.', 145.00, 'USD', true, v_cat_id,
  '{"brand": "Hella", "compatibility": ["Universal Mount", "All Equipment"], "warranty": "24 months", "specs": ["LED", "IP68 Waterproof", "20 Inch", "12000 Lumens"], "featured": true}'::jsonb,
  '/assets/products/led_light_bar.png', 50)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 50, 'Warehouse A') ON CONFLICT (product_id) DO UPDATE SET quantity = 50;
  END IF;

  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'CB-MIR-150', 'Side Mirror Assembly - Heated', 'Heated side mirror with electric adjustment. Wide-angle view.', 95.00, 'USD', true, v_cat_id,
  '{"brand": "Britax", "compatibility": ["John Deere R Series", "Case IH Optum"], "warranty": "12 months", "specs": ["Heated", "Electric Adjust", "Wide Angle", "Anti-Glare"], "featured": false}'::jsonb,
  '/assets/products/side_mirror.png', 25)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 25, 'Warehouse A') ON CONFLICT (product_id) DO UPDATE SET quantity = 25;
  END IF;

  -------------------------------------------------------
  -- CAB & BODY (Seats, Windshield, Fenders)
  -------------------------------------------------------
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'cab-body';

  -- 10. Suspension Seat (from original seed)
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'MSG85/721', 'Suspension Seat', 'Comfortable mechanical suspension seat to reduce operator fatigue during long days.', 350.00, 'USD', true, v_cat_id,
  '{"brand": "Grammer", "compatibility": ["Universal Flat Mount", "Massey Ferguson", "New Holland"], "warranty": "12 months", "specs": ["Adjustable Suspension", "Armrests", "Fabric Cover", "Ergonomic"], "featured": false}'::jsonb,
  '/assets/products/tractor_seat.png', 10)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 10, 'Warehouse B') ON CONFLICT (product_id) DO UPDATE SET quantity = 10;
  END IF;

  -- Cab Windshield Glass
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'CB-WND-400', 'Cab Windshield Glass', 'Laminated safety glass windshield. UV protection coating.', 420.00, 'USD', true, v_cat_id,
  '{"brand": "PPG", "compatibility": ["John Deere 7R", "John Deere 8R"], "warranty": "12 months", "specs": ["Laminated Safety", "UV Protection", "Tinted", "OEM Fit"], "featured": false}'::jsonb,
  '/assets/products/windshield.png', 4)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 4, 'Warehouse B') ON CONFLICT (product_id) DO UPDATE SET quantity = 4;
  END IF;

  -- Front Fender Set
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'CB-FND-600', 'Front Fender Set', 'Steel front fender set. Powder coated. Includes mounting hardware.', 260.00, 'USD', true, v_cat_id,
  '{"brand": "Generic", "compatibility": ["Most Utility Tractors"], "warranty": "12 months", "specs": ["Steel", "Powder Coated", "Complete Set", "Hardware Included"], "featured": false}'::jsonb,
  '/assets/products/fender_set.png', 14)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 14, 'Warehouse B') ON CONFLICT (product_id) DO UPDATE SET quantity = 14;
  END IF;

  -------------------------------------------------------
  -- IMPLEMENTS
  -------------------------------------------------------
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'implements';

  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'IM-PLW-8800', 'Reversible Plow Blade (Set of 5)', 'High-carbon steel reversible plow blades. Heat treated for extended life.', 320.00, 'USD', true, v_cat_id,
  '{"brand": "Lemken", "compatibility": ["3-Point Hitch", "Most Plows"], "warranty": "6 months", "specs": ["High-Carbon Steel", "Reversible", "Heat Treated", "5 Piece Set"], "featured": false}'::jsonb,
  '/assets/products/plow_blade.png', 45)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 45, 'Warehouse B') ON CONFLICT (product_id) DO UPDATE SET quantity = 45;
  END IF;

  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'IM-HRW-4400', 'Disc Harrow Bearing Assembly', 'Sealed disc harrow bearing assembly. Maintenance-free design.', 75.00, 'USD', true, v_cat_id,
  '{"brand": "Timken", "compatibility": ["Most Disc Harrows"], "warranty": "12 months", "specs": ["Sealed", "Maintenance Free", "High Load", "Corrosion Resistant"], "featured": false}'::jsonb,
  '/assets/products/harrow_bearing.png', 80)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 80, 'Warehouse A') ON CONFLICT (product_id) DO UPDATE SET quantity = 80;
  END IF;

  -------------------------------------------------------
  -- WHEELS & TIRES
  -------------------------------------------------------
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'wheels-tires';

  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'WT-TIR-1600', 'Agricultural Tire 18.4-38', 'Rear drive tire for row-crop tractors. Deep lug pattern for maximum traction.', 950.00, 'USD', true, v_cat_id,
  '{"brand": "Firestone", "compatibility": ["Most Row-Crop Tractors"], "warranty": "36 months", "specs": ["18.4-38", "Deep Lug", "8 Ply", "Maximum Traction"], "featured": true}'::jsonb,
  '/assets/products/agri_tire.png', 6)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 6, 'Warehouse C') ON CONFLICT (product_id) DO UPDATE SET quantity = 6;
  END IF;

  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'WT-RIM-800', 'Steel Wheel Rim 38x10', 'Heavy-duty steel wheel rim. Powder coated for rust protection.', 280.00, 'USD', true, v_cat_id,
  '{"brand": "Generic", "compatibility": ["Standard Agricultural", "18.4-38 Tires"], "warranty": "24 months", "specs": ["38x10", "Powder Coated", "Heavy Duty Steel", "8 Bolt"], "featured": false}'::jsonb,
  '/assets/products/wheel_rim.png', 10)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 10, 'Warehouse C') ON CONFLICT (product_id) DO UPDATE SET quantity = 10;
  END IF;

  -------------------------------------------------------
  -- DRIVETRAIN PARTS
  -------------------------------------------------------
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'drivetrain-parts';

  -- 8. PTO Shaft Guard (from original seed)
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'PTO-G100', 'PTO Shaft Guard', 'Essential safety guard for agricultural PTO shafts. Protects operators from entanglement.', 65.00, 'USD', true, v_cat_id,
  '{"brand": "Weasler", "compatibility": ["Series 1-4 PTO Shafts"], "warranty": "6 months", "specs": ["Safety Yellow", "Durable Plastic", "Universal Fit", "Easy Install"], "featured": false}'::jsonb,
  '/assets/products/pto_shaft.png', 45)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 45, 'Warehouse A') ON CONFLICT (product_id) DO UPDATE SET quantity = 45;
  END IF;

  -- PTO Shaft Assembly
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'DT-PTO-6600', 'PTO Shaft Assembly', 'Complete PTO shaft assembly with overrunning clutch. Cat 2/3 compatible.', 290.00, 'USD', true, v_cat_id,
  '{"brand": "Walterscheid", "compatibility": ["Category 2", "Category 3", "Most Tractors"], "warranty": "18 months", "specs": ["Overrunning Clutch", "Wide Angle", "Safety Shield", "Cat 2/3"], "featured": true}'::jsonb,
  '/assets/products/pto_shaft.png', 20)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 20, 'Warehouse A') ON CONFLICT (product_id) DO UPDATE SET quantity = 20;
  END IF;

  -- Front Axle U-Joint Kit
  INSERT INTO products (vendor_id, sku, name, description, price, currency, is_active, category_id, attributes, main_image, stock_quantity)
  VALUES (v_user_id, 'DT-AXL-9900', 'Front Axle U-Joint Kit', 'Universal joint kit for front axle drive shafts. Includes grease fittings.', 65.00, 'USD', true, v_cat_id,
  '{"brand": "Spicer", "compatibility": ["John Deere MFWD", "Case IH MFWD"], "warranty": "12 months", "specs": ["Complete Kit", "Grease Fittings", "Heat Treated", "Snap Ring Type"], "featured": false}'::jsonb,
  '/assets/products/ujoint_kit.png', 55)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_product_id;
  IF v_product_id IS NOT NULL THEN
    INSERT INTO inventory (product_id, vendor_id, quantity, location) VALUES (v_product_id, v_user_id, 55, 'Warehouse A') ON CONFLICT (product_id) DO UPDATE SET quantity = 55;
  END IF;

  RAISE NOTICE 'Full catalog seed completed! ~30 products inserted across all categories.';

END $$;
