-- Fixed idempotent migration to populate spare_parts table with mock data

-- First, ensure we have some test categories if none exist
INSERT INTO public.categories (id, name, description, is_active)
SELECT gen_random_uuid(), 'Engine Parts', 'Engine components and parts', true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Engine Parts');

INSERT INTO public.categories (id, name, description, is_active)
SELECT gen_random_uuid(), 'Hydraulic Parts', 'Hydraulic system components', true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Hydraulic Parts');

INSERT INTO public.categories (id, name, description, is_active)
SELECT gen_random_uuid(), 'Electrical Parts', 'Electrical system components', true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Electrical Parts');

INSERT INTO public.categories (id, name, description, is_active)
SELECT gen_random_uuid(), 'Transmission Parts', 'Transmission and drivetrain parts', true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Transmission Parts');

INSERT INTO public.categories (id, name, description, is_active)
SELECT gen_random_uuid(), 'Cooling Parts', 'Cooling system components', true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Cooling Parts');

INSERT INTO public.categories (id, name, description, is_active)
SELECT gen_random_uuid(), 'Filters', 'Various filters and filtration components', true
WHERE NOT EXISTS (SELECT 1 FROM public.categories WHERE name = 'Filters');

-- Create a default vendor if none exists  
INSERT INTO public.user_profiles (id, user_id, email, full_name, role, is_verified, is_active)
SELECT gen_random_uuid(), gen_random_uuid(), 'default.vendor@example.com', 'Default Parts Vendor', 'vendor', true, true
WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE email = 'default.vendor@example.com');

-- Insert sample spare parts with proper mappings
DO $$
DECLARE
  engine_cat_id uuid;
  hydraulic_cat_id uuid;
  electrical_cat_id uuid;
  default_vendor_id uuid;
BEGIN
  -- Get category IDs
  SELECT id INTO engine_cat_id FROM public.categories WHERE name = 'Engine Parts' LIMIT 1;
  SELECT id INTO hydraulic_cat_id FROM public.categories WHERE name = 'Hydraulic Parts' LIMIT 1;
  SELECT id INTO electrical_cat_id FROM public.categories WHERE name = 'Electrical Parts' LIMIT 1;
  SELECT id INTO default_vendor_id FROM public.user_profiles WHERE email = 'default.vendor@example.com' LIMIT 1;

  -- Insert spare parts if they don't exist
  IF NOT EXISTS (SELECT 1 FROM public.spare_parts WHERE part_number = 'RE504836') THEN
    INSERT INTO public.spare_parts (
      id, name, description, part_number, oemPartNumber, price, condition, 
      availabilityStatus, stockQuantity, images, technicalSpecs, compatibility, 
      warranty, weight, dimensions, featured, tags, category_id, vendor_id, brand
    ) VALUES (
      gen_random_uuid(), 
      'John Deere Engine Oil Filter',
      'Genuine John Deere engine oil filter for optimal engine protection and performance. High-quality filtration media ensures clean oil circulation.',
      'RE504836', 'RE504836', 45.99, 'new', 'in_stock', 150,
      ARRAY['/src/assets/Newtractor.png', '/src/assets/Newtractor1.png'],
      '{"filterType": "Spin-on", "threadSize": "3/4-16 UNF", "height": "4.5 inches", "diameter": "3.66 inches", "micronRating": "25 micron"}',
      ARRAY['6M Series', '7R Series', '8R Series'],
      '12 months', 0.8, '3.66" x 4.5"', true,
      ARRAY['genuine', 'oem', 'filter', 'engine'],
      engine_cat_id, default_vendor_id, 'John Deere'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.spare_parts WHERE part_number = 'AR103033') THEN
    INSERT INTO public.spare_parts (
      id, name, description, part_number, oemPartNumber, price, condition,
      availabilityStatus, stockQuantity, images, technicalSpecs, compatibility,
      warranty, featured, tags, category_id, vendor_id, brand
    ) VALUES (
      gen_random_uuid(),
      'John Deere Air Filter Element',
      'Primary air filter element for John Deere tractors. Ensures clean air intake for optimal engine performance.',
      'AR103033', 'AR103033', 89.50, 'new', 'in_stock', 75,
      ARRAY['/src/assets/Newtractor2.png', '/src/assets/Newtractor3.png'],
      '{"filterType": "Panel", "length": "12.5 inches", "width": "8.5 inches", "height": "2.5 inches", "efficiency": "99.5%"}',
      ARRAY['5E Series', '6M Series', '6R Series'],
      '12 months', true,
      ARRAY['air filter', 'engine', 'genuine'],
      engine_cat_id, default_vendor_id, 'John Deere'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.spare_parts WHERE part_number = 'PGP511A0280') THEN
    INSERT INTO public.spare_parts (
      id, name, description, part_number, oemPartNumber, price, condition,
      availabilityStatus, stockQuantity, images, technicalSpecs, compatibility,
      warranty, featured, tags, category_id, vendor_id, brand
    ) VALUES (
      gen_random_uuid(),
      'Hydraulic Pump Assembly',
      'High-performance hydraulic pump assembly for agricultural equipment. Provides reliable hydraulic power.',
      'PGP511A0280', 'PGP511A0280', 850.00, 'new', 'in_stock', 25,
      ARRAY['/src/assets/Newtractor4.png', '/src/assets/Newtractor5.png'],
      '{"displacement": "28 cc/rev", "maxPressure": "3000 PSI", "maxSpeed": "3000 RPM", "mounting": "SAE A 2-bolt"}',
      ARRAY['Case IH', 'New Holland', 'John Deere'],
      '24 months', true,
      ARRAY['hydraulic', 'pump', 'high pressure'],
      hydraulic_cat_id, default_vendor_id, 'Parker'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.spare_parts WHERE part_number = '87540915') THEN
    INSERT INTO public.spare_parts (
      id, name, description, part_number, oemPartNumber, price, condition,
      availabilityStatus, stockQuantity, images, technicalSpecs, compatibility,
      warranty, featured, tags, category_id, vendor_id, brand
    ) VALUES (
      gen_random_uuid(),
      'Alternator 12V 95A',
      'Heavy-duty alternator for Case IH tractors and combines. 12V output, 95 amp capacity.',
      '87540915', '87540915', 285.00, 'new', 'in_stock', 20,
      ARRAY['/src/assets/Newtractor6.png', '/src/assets/Newtractor7.png'],
      '{"voltage": "12V", "amperage": "95A", "rotation": "Clockwise", "mounting": "Pad mount"}',
      ARRAY['Magnum Series', 'Puma Series', 'Farmall Series'],
      '18 months', true,
      ARRAY['electrical', 'alternator', 'charging'],
      electrical_cat_id, default_vendor_id, 'Case IH'
    );
  END IF;

END $$;