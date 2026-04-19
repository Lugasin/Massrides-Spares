-- Adapted seed for current schema (no currency, no main_image, no inventory table, no user_profiles)
-- Uses: title, is_active, images[], stock_quantity, featured, attributes

-- 1. Ensure Categories exist
INSERT INTO categories (name, slug)
VALUES
 ('Engine Parts', 'engine-parts'),
 ('Hydraulic Parts', 'hydraulic-parts'),
 ('Electrical Parts', 'electrical-parts'),
 ('Transmission Parts', 'transmission_parts'),
 ('Cooling System', 'cooling-system'),
 ('Fuel System', 'fuel-system'),
 ('Brake Parts', 'brake-parts'),
 ('Steering Parts', 'steering-parts'),
 ('Cabin Parts', 'cabin-parts'),
 ('Implements', 'implements'),
 ('Wheels & Tires', 'wheels-tires'),
 ('Drivetrain Parts', 'drivetrain-parts'),
 ('Cab & Body', 'cab-body')
ON CONFLICT (slug) DO NOTHING;

-- 2. Insert Products (adapted to current schema)
DO $$
DECLARE
  v_cat_id bigint;
BEGIN

  -- 1. John Deere Engine Oil Filter
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'engine-parts';
  INSERT INTO products (sku, title, description, price, is_active, category_id, featured, stock_quantity, brand, condition, availability_status, part_number, min_stock_level, images, attributes)
  VALUES ('RE504836', 'John Deere Engine Oil Filter', 'Genuine John Deere engine oil filter for optimal engine protection and performance.', 45.00, true, v_cat_id, true, 125, 'John Deere', 'new', 'in_stock', 'RE504836', 10,
  ARRAY['/assets/products/engine_oil_filter.png'],
  '{"compatibility": ["6M Series", "7R Series", "8R Series"], "warranty": "12 months", "specs": ["OEM Quality", "High Filtration", "Long Life", "Easy Installation"]}'::jsonb);

  -- 2. Hydraulic Pump Assembly
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'hydraulic-parts';
  INSERT INTO products (sku, title, description, price, is_active, category_id, featured, stock_quantity, brand, condition, availability_status, part_number, min_stock_level, images, attributes)
  VALUES ('PGP511A0280', 'Hydraulic Pump Assembly', 'High-performance hydraulic pump assembly for agricultural equipment.', 850.00, true, v_cat_id, true, 25, 'Parker', 'new', 'in_stock', 'PGP511A0280', 5,
  ARRAY['/assets/products/hydraulic_pump.png'],
  '{"compatibility": ["Case IH", "New Holland", "John Deere"], "warranty": "24 months", "specs": ["High Pressure", "Durable", "OEM Replacement", "2 Year Warranty"]}'::jsonb);

  -- 3. Alternator 12V 95A
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'electrical-parts';
  INSERT INTO products (sku, title, description, price, is_active, category_id, featured, stock_quantity, brand, condition, availability_status, part_number, min_stock_level, images, attributes)
  VALUES ('87540915', 'Alternator 12V 95A', 'Heavy-duty alternator for Case IH tractors and combines.', 285.00, true, v_cat_id, true, 20, 'Case IH', 'new', 'in_stock', '87540915', 5,
  ARRAY['/assets/products/tractor_alternator.png'],
  '{"compatibility": ["Magnum Series", "Puma Series", "Farmall Series"], "warranty": "18 months", "specs": ["12V Output", "95 Amp", "Heavy Duty", "Weather Resistant"]}'::jsonb);

  -- 4. Radiator Assembly
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'cooling-system';
  INSERT INTO products (sku, title, description, price, is_active, category_id, featured, stock_quantity, brand, condition, availability_status, part_number, min_stock_level, images, attributes)
  VALUES ('1C010-17114', 'Radiator Assembly', 'High-quality radiator assembly for Kubota tractors.', 420.00, true, v_cat_id, false, 15, 'Kubota', 'new', 'in_stock', '1C010-17114', 3,
  ARRAY['/assets/products/radiator_assembly.png'],
  '{"compatibility": ["M Series", "L Series", "Grand L Series"], "warranty": "12 months", "specs": ["Aluminum Core", "Plastic Tank", "OEM Fit", "Pressure Tested"]}'::jsonb);

  -- 5. Fuel Injection Pump
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'fuel-system';
  INSERT INTO products (sku, title, description, price, is_active, category_id, featured, stock_quantity, brand, condition, availability_status, part_number, min_stock_level, images, attributes)
  VALUES ('3641832M91', 'Fuel Injection Pump', 'Remanufactured fuel injection pump for Massey Ferguson tractors.', 1250.00, true, v_cat_id, false, 8, 'Massey Ferguson', 'refurbished', 'in_stock', '3641832M91', 2,
  ARRAY['/assets/products/fuel_injection_pump.png'],
  '{"compatibility": ["MF 6400", "MF 7400", "MF 8400"], "warranty": "12 months", "specs": ["High Precision", "Rebuilt", "Tested", "Core Exchange"]}'::jsonb);

  -- 6. Brake Pad Set
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'brake-parts';
  INSERT INTO products (sku, title, description, price, is_active, category_id, featured, stock_quantity, brand, condition, availability_status, part_number, min_stock_level, images, attributes)
  VALUES ('F916200060110', 'Brake Pad Set', 'High-performance brake pads for Fendt tractors.', 95.00, true, v_cat_id, false, 60, 'Fendt', 'new', 'in_stock', 'F916200060110', 10,
  ARRAY['/assets/products/brake_pad_set.png'],
  '{"compatibility": ["Fendt 700", "Fendt 800", "Fendt 900"], "warranty": "6 months", "specs": ["Ceramic Compound", "Low Dust", "Quiet Operation", "Long Lasting"]}'::jsonb);

  -- 7. LED Work Light
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'electrical-parts';
  INSERT INTO products (sku, title, description, price, is_active, category_id, featured, stock_quantity, brand, condition, availability_status, part_number, min_stock_level, images, attributes)
  VALUES ('LED-WL48S', 'LED Work Light', 'High-intensity LED work light for night operations. Durable and weather-resistant.', 45.00, true, v_cat_id, false, 100, 'Massrides', 'new', 'in_stock', 'LED-WL48S', 15,
  ARRAY['/assets/products/tractor_headlight.png'],
  '{"compatibility": ["Universal Tractor Fit", "Combine Harvesters"], "warranty": "12 months", "specs": ["48W LED", "Flood Beam", "IP67 Waterproof", "Universal Mount"]}'::jsonb);

  -- 8. PTO Shaft Guard
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'drivetrain-parts';
  INSERT INTO products (sku, title, description, price, is_active, category_id, featured, stock_quantity, brand, condition, availability_status, part_number, min_stock_level, images, attributes)
  VALUES ('PTO-G100', 'PTO Shaft Guard', 'Essential safety guard for agricultural PTO shafts.', 65.00, true, v_cat_id, false, 45, 'Weasler', 'new', 'in_stock', 'PTO-G100', 10,
  ARRAY['/assets/products/pto_shaft.png'],
  '{"compatibility": ["Series 1-4 PTO Shafts"], "warranty": "6 months", "specs": ["Safety Yellow", "Durable Plastic", "Universal Fit", "Easy Install"]}'::jsonb);

  -- 9. Combine Air Filter
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'engine-parts';
  INSERT INTO products (sku, title, description, price, is_active, category_id, featured, stock_quantity, brand, condition, availability_status, part_number, min_stock_level, images, attributes)
  VALUES ('P181052', 'Combine Air Filter', 'Primary engine air filter for large combine harvesters.', 78.00, true, v_cat_id, true, 30, 'Donaldson', 'new', 'in_stock', 'P181052', 5,
  ARRAY['/assets/products/air_filter_combine.png'],
  '{"compatibility": ["John Deere S Series", "Case IH Axial-Flow"], "warranty": "N/A", "specs": ["Heavy Duty", "High Capacity", "Dual Seal", "Extended Life"]}'::jsonb);

  -- 10. Suspension Seat
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'cab-body';
  INSERT INTO products (sku, title, description, price, is_active, category_id, featured, stock_quantity, brand, condition, availability_status, part_number, min_stock_level, images, attributes)
  VALUES ('MSG85/721', 'Suspension Seat', 'Comfortable mechanical suspension seat to reduce operator fatigue.', 350.00, true, v_cat_id, false, 10, 'Grammer', 'new', 'in_stock', 'MSG85/721', 2,
  ARRAY['/assets/products/tractor_seat.png'],
  '{"compatibility": ["Universal Flat Mount", "Massey Ferguson", "New Holland"], "warranty": "12 months", "specs": ["Adjustable Suspension", "Armrests", "Fabric Cover", "Ergonomic"]}'::jsonb);

  -- 11. Tractor Clutch Kit
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'transmission_parts';
  INSERT INTO products (sku, title, description, price, is_active, category_id, featured, stock_quantity, brand, condition, availability_status, part_number, min_stock_level, images, attributes)
  VALUES ('628302009', 'Tractor Clutch Kit', 'Complete clutch replacement kit for reliable power transmission.', 480.00, true, v_cat_id, false, 12, 'LuK', 'new', 'in_stock', '628302009', 3,
  ARRAY['/assets/products/clutch_kit.png'],
  '{"compatibility": ["Ford New Holland", "Fiat Agri"], "warranty": "12 months", "specs": ["Pressure Plate", "Clutch Disc", "Release Bearing", "Alignment Tool"]}'::jsonb);

  -- 12. Used Transmission Assembly
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'transmission_parts';
  INSERT INTO products (sku, title, description, price, is_active, category_id, featured, stock_quantity, brand, condition, availability_status, part_number, min_stock_level, images, attributes)
  VALUES ('RE234567-U', 'Used Transmission Assembly', 'Remanufactured transmission assembly from John Deere 7R series.', 2500.00, true, v_cat_id, false, 1, 'John Deere', 'refurbished', 'in_stock', 'RE234567-U', 0,
  ARRAY['/assets/products/transmission_assembly.png'],
  '{"compatibility": ["7R Series", "8R Series"], "warranty": "6 months", "specs": ["Rebuilt", "Tested", "6 Month Warranty", "Core Required"], "condition": "Refurbished"}'::jsonb);

  -- 13. Used Hydraulic Cylinder
  SELECT id INTO v_cat_id FROM categories WHERE slug = 'hydraulic-parts';
  INSERT INTO products (sku, title, description, price, is_active, category_id, featured, stock_quantity, brand, condition, availability_status, part_number, min_stock_level, images, attributes)
  VALUES ('87540123-U', 'Used Hydraulic Cylinder', 'Resealed hydraulic cylinder from Case IH Magnum tractor.', 450.00, true, v_cat_id, false, 2, 'Case IH', 'used', 'in_stock', '87540123-U', 0,
  ARRAY['/assets/products/hydraulic_cylinder.png'],
  '{"compatibility": ["Magnum Series", "Puma Series"], "warranty": "3 months", "specs": ["Resealed", "Pressure Tested", "90 Day Warranty"], "condition": "Used"}'::jsonb);

END $$;
