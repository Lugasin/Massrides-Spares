-- Seed Products Data with Images and Details

-- 1. Ensure Schema Compatibility (Add all missing columns)
DO $$ 
BEGIN 
    -- part_number
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'part_number') THEN
        ALTER TABLE products ADD COLUMN part_number TEXT;
    END IF;

    -- category (text) - init has category_id but our seed uses text
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'category') THEN
        ALTER TABLE products ADD COLUMN category TEXT;
    END IF;

    -- brand
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'brand') THEN
        ALTER TABLE products ADD COLUMN brand TEXT;
    END IF;

    -- image (init uses main_image, but we need 'image' alias or we map it)
    -- Let's add 'image' for compatibility
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image') THEN
        ALTER TABLE products ADD COLUMN image TEXT;
    END IF;

    -- specs
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'specs') THEN
        ALTER TABLE products ADD COLUMN specs TEXT[];
    END IF;

    -- in_stock
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'in_stock') THEN
        ALTER TABLE products ADD COLUMN in_stock BOOLEAN DEFAULT TRUE;
    END IF;

    -- compatibility
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'compatibility') THEN
        ALTER TABLE products ADD COLUMN compatibility TEXT[];
    END IF;

    -- featured
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'featured') THEN
        ALTER TABLE products ADD COLUMN featured BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Insert Data
-- Using 'title' instead of 'name' based on schema
INSERT INTO products (title, part_number, price, description, category, brand, image, specs, in_stock, attributes, compatibility, featured)
VALUES
  (
    'John Deere Engine Oil Filter',
    'RE504836',
    45.99,
    'Genuine John Deere engine oil filter for optimal engine protection and performance.',
    'Engine Parts',
    'John Deere',
    '/assets/products/engine_oil_filter.png',
    ARRAY['OEM Quality', 'High Filtration', 'Long Life', 'Easy Installation'],
    true,
    '{"warranty": "12 months"}',
    ARRAY['Universal Utility Tractors'],
    true
  ),
  (
    'John Deere Air Filter Element',
    'AR103033',
    89.50,
    'Primary air filter element for John Deere tractors.',
    'Engine Parts',
    'John Deere',
    '/assets/products/air_filter_combine.png',
    ARRAY['Primary Element', 'High Efficiency'],
    true,
    '{"warranty": "12 months"}',
    ARRAY['John Deere 5000 Series', 'John Deere 6000 Series'],
    false
  ),
  (
    'Fuel Filter Water Separator',
    'RE62418',
    125.00,
    'Fuel filter with water separator for diesel engines.',
    'Engine Parts',
    'John Deere',
    '/assets/products/fuel_filter_water_separator.png',
    ARRAY['With Water Separator', 'Diesel Compatible'],
    true,
    '{"warranty": "12 months"}',
    ARRAY['Universal Diesel Engines'],
    false
  ),
  (
    'Hydraulic Pump Assembly',
    'PGP511A0280',
    850.00,
    'High-performance hydraulic pump assembly.',
    'Hydraulic Parts',
    'Parker',
    '/assets/products/hydraulic_pump.png',
    ARRAY['High Flow', 'Heavy Duty'],
    true,
    '{"warranty": "24 months"}',
    ARRAY['Most Utility Tractors'],
    true
  ),
  (
    'Alternator 12V 95A',
    '87540915',
    285.00,
    'Heavy-duty alternator for Case IH tractors.',
    'Electrical Parts',
    'Case IH',
    '/assets/products/tractor_alternator.png',
    ARRAY['12V', '95 Amps', 'Internal Regulator'],
    true,
    '{"warranty": "18 months"}',
    ARRAY['Case IH Maxxum', 'Case IH Puma'],
    true
  ),
  (
    'Transmission Filter Kit',
    'RE234567',
    125.00,
    'Complete transmission filter kit including gaskets and seals.',
    'Transmission Parts',
    'John Deere',
    '/assets/products/transmission_filter_kit.png',
    ARRAY['Includes Gaskets', 'High Filtration'],
    true,
    '{"warranty": "12 months"}',
    ARRAY['John Deere PowerQuad'],
    false
  ),
  (
    'Radiator Assembly',
    '1C010-17114',
    420.00,
    'High-quality radiator assembly for Kubota tractors.',
    'Cooling System',
    'Kubota',
    '/assets/products/radiator_assembly.png',
    ARRAY['Aluminum Core', 'OEM Fit'],
    true,
    '{"warranty": "12 months"}',
    ARRAY['Kubota L Series'],
    false
  ),
  (
    'Fuel Injection Pump',
    '3641832M91',
    1250.00,
    'Remanufactured fuel injection pump for Massey Ferguson tractors.',
    'Fuel System',
    'Massey Ferguson',
    '/assets/products/fuel_injection_pump.png',
    ARRAY['Remanufactured', 'Calibrated'],
    true,
    '{"warranty": "12 months"}',
    ARRAY['Massey Ferguson 300 Series'],
    false
  ),
  (
    'Brake Pad Set',
    'F916200060110',
    95.00,
    'High-performance brake pads.',
    'Brake Parts',
    'Fendt',
    '/assets/products/brake_pad_set.png',
    ARRAY['Asbestos Free', 'High Friction'],
    true,
    '{"warranty": "6 months"}',
    ARRAY['Fendt 700 Vario'],
    false
  ),
  (
    'Steering Wheel Assembly',
    'STEER-WHEEL-001',
    145.00,
    'Complete steering wheel assembly with horn button.',
    'Steering Parts',
    'Universal',
    '/assets/products/steering_wheel.png',
    ARRAY['14 inch diameter', 'Soft Grip'],
    true,
    '{"warranty": "12 months"}',
    ARRAY['Universal'],
    false
  ),
  (
    'Operator Seat with Suspension',
    'SEAT-SUSP-001',
    650.00,
    'Comfortable operator seat with air suspension.',
    'Cabin Parts',
    'Grammer',
    '/assets/products/tractor_seat.png',
    ARRAY['Air Suspension', 'Armrests', 'Cloth Fabric'],
    true,
    '{"warranty": "24 months"}',
    ARRAY['Universal'],
    false
  ),
  (
    'Plow Share 16"',
    'PLOW-SHARE-001',
    85.00,
    'Heavy-duty plow share for 16-inch plows.',
    'Implements',
    'Generic',
    '/assets/products/plow_share.png',
    ARRAY['Heat Treated Steel', '16 Inch'],
    true,
    '{"warranty": "6 months"}',
    ARRAY['Universal Plows'],
    false
  ),
  (
    'Front Tire 12.4-24',
    'TIRE-FRONT-001',
    285.00,
    'Front tractor tire with R-1 tread pattern.',
    'Wheels & Tires',
    'Firestone',
    '/assets/products/tractor_tire.png',
    ARRAY['12.4-24', 'R-1 Tread', '8 Ply'],
    true,
    '{"warranty": "12 months"}',
    ARRAY['Universal Utility Tractors'],
    false
  ),
  (
    'Disc Plough 3-Disc',
    'PLOUGH-DISC-003',
    1250.00,
    'Heavy duty 3-disc plough for primary tillage in tough soil conditions.',
    'Implements',
    'Massey Ferguson',
    '/assets/products/disc_plough.png',
    ARRAY['3 Discs', 'Heavy Duty Frame', 'Adjustable Width'],
    true,
    '{"warranty": "12 months"}',
    ARRAY['Tractors 50-75HP'],
    false
  ),
  (
    'Knapsack Sprayer 16L',
    'SPRAYER-16L',
    45.00,
    'Manual knapsack sprayer for crop protection and weed control.',
    'Implements',
    'Generic',
    '/assets/products/knapsack_sprayer.png',
    ARRAY['16L Capacity', 'Manual Pump', 'Adjustable Nozzle'],
    true,
    '{"warranty": "6 months"}',
    ARRAY['Universal'],
    false
  ),
  (
    'Solar Borehole Pump Kit',
    'SOLAR-PUMP-001',
    850.00,
    'Complete solar submersible pump kit for off-grid irrigation.',
    'Hydraulic Parts',
    'Generic',
    '/assets/products/solar_borehole_pump.png',
    ARRAY['Submersible', 'Solar Controller Included', 'Stainless Steel'],
    true,
    '{"warranty": "12 months"}',
    ARRAY['Universal'],
    false
  ),
  (
    'Tractor Battery 12V 100Ah',
    'BATTERY-12V-100AH',
    185.00,
    'High-performance heavy-duty battery for agricultural machinery.',
    'Electrical Parts',
    'Exide',
    '/assets/products/tractor_battery.png',
    ARRAY['12V', '100Ah', 'Maintenance Free'],
    true,
    '{"warranty": "12 months"}',
    ARRAY['Universal Tractor Fit'],
    false
  ),
  (
    'Combine Air Filter',
    'P181052',
    78.00,
    'High efficiency air filter for combine harvesters.',
    'Engine Parts',
    'Donaldson',
    '/assets/products/air_filter_combine.png',
    ARRAY['High Efficiency', 'Standard Fit'],
    true,
    '{"warranty": "12 months"}',
    ARRAY['Universal Combines'],
    true
  )
ON CONFLICT (part_number) 
DO UPDATE SET 
  title = EXCLUDED.title,
  price = EXCLUDED.price,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  brand = EXCLUDED.brand,
  image = EXCLUDED.image,
  specs = EXCLUDED.specs,
  in_stock = EXCLUDED.in_stock,
  attributes = EXCLUDED.attributes,
  compatibility = EXCLUDED.compatibility,
  featured = EXCLUDED.featured;
