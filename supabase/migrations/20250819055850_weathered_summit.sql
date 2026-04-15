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
INSERT INTO categories (name, slug) VALUES
  ('Engine Parts', 'engine-parts'),
  ('Hydraulic Parts', 'hydraulic-parts'),
  ('Electrical Parts', 'electrical-parts'),
  ('Transmission Parts', 'transmission-parts'),
  ('Cooling System', 'cooling-system')
ON CONFLICT (slug) DO NOTHING;

-- Get category IDs for insertion
DO $$
DECLARE
  engine_cat_id bigint;
  hydraulic_cat_id bigint;
  electrical_cat_id bigint;
  transmission_cat_id bigint;
  cooling_cat_id bigint;
  vendor_id bigint;
BEGIN
  -- Get category IDs
  SELECT id INTO engine_cat_id FROM categories WHERE slug = 'engine-parts';
  SELECT id INTO hydraulic_cat_id FROM categories WHERE slug = 'hydraulic-parts';
  SELECT id INTO electrical_cat_id FROM categories WHERE slug = 'electrical-parts';
  SELECT id INTO transmission_cat_id FROM categories WHERE slug = 'transmission-parts';
  SELECT id INTO cooling_cat_id FROM categories WHERE slug = 'cooling-system';
  
  -- Get first vendor or create a default one
  SELECT id INTO vendor_id FROM vendors LIMIT 1;
  
  IF vendor_id IS NULL THEN
    -- Create a default vendor profile and vendor if none exists
    INSERT INTO profiles (id, email, full_name, role)
    VALUES (gen_random_uuid(), 'vendor@massrides.co.zm', 'Default Vendor', 'vendor');
    
    INSERT INTO vendors (owner_id, corporate_name, slug, description, contact_email)
    SELECT gen_random_uuid(), 'Massrides Parts', 'massrides-parts', 'Default vendor for mock products', 'vendor@massrides.co.zm'
    RETURNING id INTO vendor_id;
  END IF;

  -- Insert mock products
  INSERT INTO products (
    vendor_id, sku, title, description, price, category_id, condition, attributes
  ) VALUES
  (
    vendor_id,
    'JD-RE504836',
    'John Deere Engine Oil Filter',
    'Genuine John Deere engine oil filter for optimal engine protection and performance. High-quality filtration media ensures clean oil circulation.',
    45.99,
    engine_cat_id,
    'new',
    '{"brand": "John Deere", "warranty": "12 months", "specs": {"filterType": "Spin-on", "threadSize": "3/4-16 UNF", "height": "4.5 inches", "diameter": "3.66 inches", "micronRating": "25 micron"}, "compatibility": ["6M Series", "7R Series", "8R Series"], "tags": ["genuine", "oem", "filter", "engine"]}'::jsonb
  ),
  (
    vendor_id,
    'PK-PGP511A0280',
    'Hydraulic Pump Assembly',
    'High-performance hydraulic pump assembly for agricultural equipment. Provides reliable hydraulic power for implements and steering.',
    850.00,
    hydraulic_cat_id,
    'new',
    '{"brand": "Parker", "warranty": "24 months", "specs": {"displacement": "28 cc/rev", "maxPressure": "3000 PSI", "maxSpeed": "3000 RPM", "mounting": "SAE A 2-bolt"}, "compatibility": ["Case IH Magnum", "New Holland T7", "John Deere 7R"], "tags": ["hydraulic", "pump", "high pressure", "reliable"]}'::jsonb
  ),
  (
    vendor_id,
    'CI-87540915',
    'Alternator 12V 95A',
    'Heavy-duty alternator for Case IH tractors and combines. 12V output, 95 amp capacity with internal voltage regulator.',
    285.00,
    electrical_cat_id,
    'new',
    '{"brand": "Case IH", "warranty": "18 months", "specs": {"voltage": "12V", "amperage": "95A", "rotation": "Clockwise", "mounting": "Pad mount", "regulator": "Internal"}, "compatibility": ["Magnum Series", "Puma Series", "Farmall Series"], "tags": ["electrical", "alternator", "charging", "heavy duty"]}'::jsonb
  ),
  (
    vendor_id,
    'JD-RE234567',
    'Transmission Filter Kit',
    'Complete transmission filter kit including gaskets and seals for John Deere tractors. Essential for transmission maintenance.',
    125.00,
    transmission_cat_id,
    'new',
    '{"brand": "John Deere", "warranty": "12 months", "specs": {}, "compatibility": ["7R Series", "8R Series"], "tags": ["transmission", "filter", "kit", "genuine", "maintenance"]}'::jsonb
  ),
  (
    vendor_id,
    'CI-Radiator-001',
    'Radiator Assembly',
    'Complete radiator assembly with fan and shroud for optimal cooling performance in agricultural applications.',
    450.00,
    cooling_cat_id,
    'new',
    '{"brand": "Case IH", "warranty": "24 months", "specs": {"coreType": "Aluminum", "rows": 3, "capacity": "8 quarts"}, "compatibility": ["Magnum Series", "Puma Series"], "tags": ["cooling", "radiator", "assembly", "heavy duty"]}'::jsonb
  );
END $$;