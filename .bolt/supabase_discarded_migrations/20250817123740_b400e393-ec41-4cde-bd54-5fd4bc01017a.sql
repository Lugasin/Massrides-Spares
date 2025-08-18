-- Fix database constraints and add mock data
-- Update spare_parts condition constraint to allow 'remanufactured'
ALTER TABLE spare_parts DROP CONSTRAINT IF EXISTS spare_parts_condition_check;
ALTER TABLE spare_parts ADD CONSTRAINT spare_parts_condition_check 
  CHECK (condition IN ('new', 'used', 'refurbished', 'remanufactured'));

-- Add some categories if they don't exist
INSERT INTO categories (name, description, is_active) VALUES
  ('Engine Parts', 'Engine components and filters', true),
  ('Hydraulic Systems', 'Hydraulic pumps, hoses, and components', true),
  ('Brake Systems', 'Brake pads, discs, and brake components', true),
  ('Transmission', 'Transmission belts, gears, and components', true),
  ('Electrical', 'Alternators, starters, and electrical components', true)
ON CONFLICT (name) DO NOTHING;

-- Add mock products with proper conditions
INSERT INTO spare_parts (
  name, description, part_number, brand, price, stock_quantity, 
  category_id, vendor_id, oem_part_number, aftermarket_part_number,
  condition, warranty, weight, dimensions, compatibility, 
  technical_specs, images, tags, featured, is_active
) VALUES 
  ('John Deere Engine Filter', 'High-quality engine oil filter for John Deere tractors', 'JD-EF-001', 'John Deere', 45.99, 50, 
   (SELECT id FROM categories WHERE name = 'Engine Parts' LIMIT 1), 
   (SELECT id FROM user_profiles WHERE role = 'vendor' LIMIT 1),
   'RE509672', 'AF-JD-001', 'new', '12 months', 0.5, '10x5x5 cm', 
   ARRAY['John Deere 5000 Series', 'John Deere 6000 Series'], 
   '{"material": "synthetic", "micron_rating": "10"}',
   ARRAY['/assets/Newtractor.png'], ARRAY['filter', 'engine', 'john-deere'], true, true),
   
  ('Kubota Hydraulic Pump', 'Replacement hydraulic pump for Kubota tractors', 'KB-HP-002', 'Kubota', 299.99, 25,
   (SELECT id FROM categories WHERE name = 'Hydraulic Systems' LIMIT 1),
   (SELECT id FROM user_profiles WHERE role = 'vendor' LIMIT 1),
   'K7561-71512', 'KB-HP-002A', 'new', '24 months', 12.5, '30x25x20 cm',
   ARRAY['Kubota L-Series', 'Kubota M-Series'], 
   '{"flow_rate": "25 GPM", "pressure": "3000 PSI"}',
   ARRAY['/assets/Newtractor2.png'], ARRAY['hydraulic', 'pump', 'kubota'], true, true),
   
  ('Massey Ferguson Brake Pads', 'Heavy-duty brake pads for Massey Ferguson tractors', 'MF-BP-003', 'Massey Ferguson', 89.99, 75,
   (SELECT id FROM categories WHERE name = 'Brake Systems' LIMIT 1),
   (SELECT id FROM user_profiles WHERE role = 'vendor' LIMIT 1),
   '1860350M1', 'MF-BP-003X', 'new', '18 months', 2.3, '15x10x3 cm',
   ARRAY['MF 4700 Series', 'MF 5700 Series'], 
   '{"friction_coefficient": "0.45", "temperature_range": "-40 to 300°C"}',
   ARRAY['/assets/Newtractor3.png'], ARRAY['brake', 'safety', 'massey-ferguson'], false, true),
   
  ('New Holland Transmission Belt', 'Durable transmission belt for New Holland equipment', 'NH-TB-004', 'New Holland', 125.50, 40,
   (SELECT id FROM categories WHERE name = 'Transmission' LIMIT 1),
   (SELECT id FROM user_profiles WHERE role = 'vendor' LIMIT 1),
   '84477891', 'NH-TB-004B', 'new', '12 months', 1.2, '120x3x1 cm',
   ARRAY['New Holland T4 Series', 'New Holland T5 Series'], 
   '{"length": "120cm", "width": "3cm", "material": "rubber"}',
   ARRAY['/assets/Newtractor4.png'], ARRAY['belt', 'transmission', 'new-holland'], false, true),
   
  ('International Harvester Alternator', 'High-output alternator for IH tractors', 'IH-ALT-005', 'International Harvester', 189.99, 30,
   (SELECT id FROM categories WHERE name = 'Electrical' LIMIT 1),
   (SELECT id FROM user_profiles WHERE role = 'vendor' LIMIT 1),
   '87682323', 'IH-ALT-005C', 'remanufactured', '12 months', 8.5, '25x20x15 cm',
   ARRAY['Case IH Magnum Series', 'Case IH Puma Series'], 
   '{"voltage": "12V", "amperage": "160A", "rotation": "clockwise"}',
   ARRAY['/assets/Newtractor5.png'], ARRAY['electrical', 'alternator', 'case-ih'], true, true);

-- Force schema reload
NOTIFY pgrst, 'reload schema';