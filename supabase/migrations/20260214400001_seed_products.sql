-- Migration: Seed Spare Parts (Products)
-- Description: Inserting products after categories are seeded.

-- 1. John Deere Engine Oil Filter
INSERT INTO public.spare_parts (
    id, name, part_number, price, category_id, brand, description, 
    technical_specs, compatibility, warranty, 
    images, is_active, stock_quantity, availability_status, featured
)
SELECT 
    gen_random_uuid(),
    'John Deere Engine Oil Filter',
    'RE504836',
    45,
    (SELECT id FROM public.categories WHERE name = 'Engine Parts' LIMIT 1),
    'John Deere',
    'Genuine John Deere engine oil filter for optimal engine protection and performance.',
    '["OEM Quality", "High Filtration", "Long Life", "Easy Installation"]'::jsonb,
    ARRAY['6M Series', '7R Series', '8R Series'],
    '12 months',
    ARRAY['/placeholder-part.png'],
    true,
    100,
    'in_stock',
    true
WHERE NOT EXISTS (SELECT 1 FROM public.spare_parts WHERE part_number = 'RE504836');

-- 2. Hydraulic Pump Assembly
INSERT INTO public.spare_parts (
    id, name, part_number, price, category_id, brand, description,
    technical_specs, compatibility, warranty,
    images, is_active, stock_quantity, availability_status, featured
)
SELECT 
    gen_random_uuid(),
    'Hydraulic Pump Assembly',
    'PGP511A0280',
    850,
    (SELECT id FROM public.categories WHERE name = 'Hydraulic Parts' LIMIT 1),
    'Parker',
    'High-performance hydraulic pump assembly for agricultural equipment.',
    '["High Pressure", "Durable", "OEM Replacement", "2 Year Warranty"]'::jsonb,
    ARRAY['Case IH', 'New Holland', 'John Deere'],
    '24 months',
    ARRAY['/placeholder-part.png'],
    true,
    5,
    'in_stock',
    true
WHERE NOT EXISTS (SELECT 1 FROM public.spare_parts WHERE part_number = 'PGP511A0280');

-- 3. Alternator 12V 95A
INSERT INTO public.spare_parts (
    id, name, part_number, price, category_id, brand, description,
    technical_specs, compatibility, warranty,
    images, is_active, stock_quantity, availability_status, featured
)
SELECT 
    gen_random_uuid(),
    'Alternator 12V 95A',
    '87540915',
    285,
    (SELECT id FROM public.categories WHERE name = 'Electrical Parts' LIMIT 1),
    'Case IH',
    'Heavy-duty alternator for Case IH tractors and combines.',
    '["12V Output", "95 Amp", "Heavy Duty", "Weather Resistant"]'::jsonb,
    ARRAY['Magnum Series', 'Puma Series', 'Farmall Series'],
    '18 months',
    ARRAY['/placeholder-part.png'],
    true,
    20,
    'in_stock',
    true
WHERE NOT EXISTS (SELECT 1 FROM public.spare_parts WHERE part_number = '87540915');

-- 4. Radiator Assembly
INSERT INTO public.spare_parts (
    id, name, part_number, price, category_id, brand, description,
    technical_specs, compatibility, warranty,
    images, is_active, stock_quantity, availability_status, featured
)
SELECT 
    gen_random_uuid(),
    'Radiator Assembly',
    '1C010-17114',
    420,
    (SELECT id FROM public.categories WHERE name = 'Cooling System' LIMIT 1),
    'Kubota',
    'High-quality radiator assembly for Kubota tractors.',
    '["Aluminum Core", "Plastic Tank", "OEM Fit", "Pressure Tested"]'::jsonb,
    ARRAY['M Series', 'L Series', 'Grand L Series'],
    '12 months',
    ARRAY['/placeholder-part.png'],
    true,
    8,
    'in_stock',
    false
WHERE NOT EXISTS (SELECT 1 FROM public.spare_parts WHERE part_number = '1C010-17114');

-- 5. Fuel Injection Pump
INSERT INTO public.spare_parts (
    id, name, part_number, price, category_id, brand, description,
    technical_specs, compatibility, warranty,
    images, is_active, stock_quantity, availability_status, featured
)
SELECT 
    gen_random_uuid(),
    'Fuel Injection Pump',
    '3641832M91',
    1250,
    (SELECT id FROM public.categories WHERE name = 'Fuel System' LIMIT 1),
    'Massey Ferguson',
    'Remanufactured fuel injection pump for Massey Ferguson tractors.',
    '["High Precision", "Rebuilt", "Tested", "Core Exchange"]'::jsonb,
    ARRAY['MF 6400', 'MF 7400', 'MF 8400'],
    '12 months',
    ARRAY['/placeholder-part.png'],
    true,
    3,
    'in_stock',
    false
WHERE NOT EXISTS (SELECT 1 FROM public.spare_parts WHERE part_number = '3641832M91');

-- 6. Brake Pad Set
INSERT INTO public.spare_parts (
    id, name, part_number, price, category_id, brand, description,
    technical_specs, compatibility, warranty,
    images, is_active, stock_quantity, availability_status, featured
)
SELECT 
    gen_random_uuid(),
    'Brake Pad Set',
    'F916200060110',
    95,
    (SELECT id FROM public.categories WHERE name = 'Brake Parts' LIMIT 1),
    'Fendt',
    'High-performance brake pads for Fendt tractors.',
    '["Ceramic Compound", "Low Dust", "Quiet Operation", "Long Lasting"]'::jsonb,
    ARRAY['Fendt 700', 'Fendt 800', 'Fendt 900'],
    '6 months',
    ARRAY['/placeholder-part.png'],
    true,
    40,
    'in_stock',
    false
WHERE NOT EXISTS (SELECT 1 FROM public.spare_parts WHERE part_number = 'F916200060110');

-- 7. LED Work Light
INSERT INTO public.spare_parts (
    id, name, part_number, price, category_id, brand, description,
    technical_specs, compatibility, warranty,
    images, is_active, stock_quantity, availability_status, featured
)
SELECT 
    gen_random_uuid(),
    'LED Work Light',
    'LED-WL48S',
    45,
    (SELECT id FROM public.categories WHERE name = 'Electrical Parts' LIMIT 1),
    'Massrides',
    'High-intensity LED work light for night operations. Durable and weather-resistant.',
    '["48W LED", "Flood Beam", "IP67 Waterproof", "Universal Mount"]'::jsonb,
    ARRAY['Universal Tractor Fit', 'Combine Harvesters'],
    '12 months',
    ARRAY['/placeholder-part.png'],
    true,
    150,
    'in_stock',
    false
WHERE NOT EXISTS (SELECT 1 FROM public.spare_parts WHERE part_number = 'LED-WL48S');

-- 8. PTO Shaft Guard
INSERT INTO public.spare_parts (
    id, name, part_number, price, category_id, brand, description,
    technical_specs, compatibility, warranty,
    images, is_active, stock_quantity, availability_status, featured
)
SELECT 
    gen_random_uuid(),
    'PTO Shaft Guard',
    'PTO-G100',
    65,
    (SELECT id FROM public.categories WHERE name = 'Drivetrain Parts' LIMIT 1),
    'Weasler',
    'Essential safety guard for agricultural PTO shafts. Protects operators from entanglement.',
    '["Safety Yellow", "Durable Plastic", "Universal Fit", "Easy Install"]'::jsonb,
    ARRAY['Series 1-4 PTO Shafts'],
    '6 months',
    ARRAY['/placeholder-part.png'],
    true,
    30,
    'in_stock',
    false
WHERE NOT EXISTS (SELECT 1 FROM public.spare_parts WHERE part_number = 'PTO-G100');

-- 9. Combine Air Filter
INSERT INTO public.spare_parts (
    id, name, part_number, price, category_id, brand, description,
    technical_specs, compatibility, warranty,
    images, is_active, stock_quantity, availability_status, featured
)
SELECT 
    gen_random_uuid(),
    'Combine Air Filter',
    'P181052',
    78,
    (SELECT id FROM public.categories WHERE name = 'Engine Parts' LIMIT 1),
    'Donaldson',
    'Primary engine air filter for large combine harvesters. Ensures clean air for maximum power.',
    '["Heavy Duty", "High Capacity", "Dual Seal", "Extended Life"]'::jsonb,
    ARRAY['John Deere S Series', 'Case IH Axial-Flow'],
    'N/A',
    ARRAY['/placeholder-part.png'],
    true,
    15,
    'in_stock',
    true
WHERE NOT EXISTS (SELECT 1 FROM public.spare_parts WHERE part_number = 'P181052');

-- 10. Suspension Seat
INSERT INTO public.spare_parts (
    id, name, part_number, price, category_id, brand, description,
    technical_specs, compatibility, warranty,
    images, is_active, stock_quantity, availability_status, featured
)
SELECT 
    gen_random_uuid(),
    'Suspension Seat',
    'MSG85/721',
    350,
    (SELECT id FROM public.categories WHERE name = 'Cab & Body' LIMIT 1),
    'Grammer',
    'Comfortable mechanical suspension seat to reduce operator fatigue during long days.',
    '["Adjustable Suspension", "Armrests", "Fabric Cover", "Ergonomic"]'::jsonb,
    ARRAY['Universal Flat Mount', 'Massey Ferguson', 'New Holland'],
    '12 months',
    ARRAY['/placeholder-part.png'],
    true,
    5,
    'in_stock',
    false
WHERE NOT EXISTS (SELECT 1 FROM public.spare_parts WHERE part_number = 'MSG85/721');

-- 11. Tractor Clutch Kit
INSERT INTO public.spare_parts (
    id, name, part_number, price, category_id, brand, description,
    technical_specs, compatibility, warranty,
    images, is_active, stock_quantity, availability_status, featured
)
SELECT 
    gen_random_uuid(),
    'Tractor Clutch Kit',
    '628302009',
    480,
    (SELECT id FROM public.categories WHERE name = 'Transmission Parts' LIMIT 1),
    'LuK',
    'Complete clutch replacement kit for reliable power transmission.',
    '["Pressure Plate", "Clutch Disc", "Release Bearing", "Alignment Tool"]'::jsonb,
    ARRAY['Ford New Holland', 'Fiat Agri'],
    '12 months',
    ARRAY['/placeholder-part.png'],
    true,
    7,
    'in_stock',
    false
WHERE NOT EXISTS (SELECT 1 FROM public.spare_parts WHERE part_number = '628302009');

-- 12. Used Transmission Assembly
INSERT INTO public.spare_parts (
    id, name, part_number, price, category_id, brand, description,
    technical_specs, compatibility, warranty,
    images, is_active, stock_quantity, availability_status, condition, featured
)
SELECT 
    gen_random_uuid(),
    'Used Transmission Assembly',
    'RE234567',
    2500,
    (SELECT id FROM public.categories WHERE name = 'Transmission Parts' LIMIT 1),
    'John Deere',
    'Remanufactured transmission assembly from John Deere 7R series.',
    '["Rebuilt", "Tested", "6 Month Warranty", "Core Required"]'::jsonb,
    ARRAY['7R Series', '8R Series'],
    '6 months',
    ARRAY['/placeholder-part.png'],
    true,
    1,
    'in_stock',
    'refurbished',
    false
WHERE NOT EXISTS (SELECT 1 FROM public.spare_parts WHERE part_number = 'RE234567');

-- 13. Used Hydraulic Cylinder
INSERT INTO public.spare_parts (
    id, name, part_number, price, category_id, brand, description,
    technical_specs, compatibility, warranty,
    images, is_active, stock_quantity, availability_status, condition, featured
)
SELECT 
    gen_random_uuid(),
    'Used Hydraulic Cylinder',
    '87540123',
    450,
    (SELECT id FROM public.categories WHERE name = 'Hydraulic Parts' LIMIT 1),
    'Case IH',
    'Resealed hydraulic cylinder from Case IH Magnum tractor.',
    '["Resealed", "Pressure Tested", "90 Day Warranty"]'::jsonb,
    ARRAY['Magnum Series', 'Puma Series'],
    '3 months',
    ARRAY['/placeholder-part.png'],
    true,
    2,
    'in_stock',
    'used',
    false
WHERE NOT EXISTS (SELECT 1 FROM public.spare_parts WHERE part_number = '87540123');
