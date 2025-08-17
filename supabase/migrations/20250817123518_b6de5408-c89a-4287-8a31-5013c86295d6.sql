-- Create user_settings table and fix database issues
-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  marketing_emails boolean DEFAULT false,
  order_updates boolean DEFAULT true,
  theme text DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  language text DEFAULT 'en',
  currency text DEFAULT 'USD',
  timezone text DEFAULT 'Africa/Lusaka',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on user_settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for user settings
CREATE POLICY "Users can manage own settings"
  ON user_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.id = user_settings.user_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.id = user_settings.user_id
    )
  );

-- Create updated_at trigger for user_settings
CREATE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add mock products with all necessary fields
INSERT INTO spare_parts (
  name, description, part_number, brand, price, stock_quantity, 
  category_id, vendor_id, oem_part_number, aftermarket_part_number,
  condition, warranty, weight, dimensions, compatibility, 
  technical_specs, images, tags, featured, is_active
) VALUES 
  ('John Deere Engine Filter', 'High-quality engine oil filter for John Deere tractors', 'JD-EF-001', 'John Deere', 45.99, 50, 
   (SELECT id FROM categories WHERE name ILIKE '%filter%' OR name ILIKE '%engine%' LIMIT 1), 
   (SELECT id FROM user_profiles WHERE role = 'vendor' LIMIT 1),
   'RE509672', 'AF-JD-001', 'new', '12 months', 0.5, '10x5x5 cm', 
   ARRAY['John Deere 5000 Series', 'John Deere 6000 Series'], 
   '{"material": "synthetic", "micron_rating": "10"}',
   ARRAY['/assets/Newtractor.png'], ARRAY['filter', 'engine', 'john-deere'], true, true),
   
  ('Kubota Hydraulic Pump', 'Replacement hydraulic pump for Kubota tractors', 'KB-HP-002', 'Kubota', 299.99, 25,
   (SELECT id FROM categories WHERE name ILIKE '%hydraulic%' OR name ILIKE '%pump%' LIMIT 1),
   (SELECT id FROM user_profiles WHERE role = 'vendor' LIMIT 1),
   'K7561-71512', 'KB-HP-002A', 'new', '24 months', 12.5, '30x25x20 cm',
   ARRAY['Kubota L-Series', 'Kubota M-Series'], 
   '{"flow_rate": "25 GPM", "pressure": "3000 PSI"}',
   ARRAY['/assets/Newtractor2.png'], ARRAY['hydraulic', 'pump', 'kubota'], true, true),
   
  ('Massey Ferguson Brake Pads', 'Heavy-duty brake pads for Massey Ferguson tractors', 'MF-BP-003', 'Massey Ferguson', 89.99, 75,
   (SELECT id FROM categories WHERE name ILIKE '%brake%' LIMIT 1),
   (SELECT id FROM user_profiles WHERE role = 'vendor' LIMIT 1),
   '1860350M1', 'MF-BP-003X', 'new', '18 months', 2.3, '15x10x3 cm',
   ARRAY['MF 4700 Series', 'MF 5700 Series'], 
   '{"friction_coefficient": "0.45", "temperature_range": "-40 to 300°C"}',
   ARRAY['/assets/Newtractor3.png'], ARRAY['brake', 'safety', 'massey-ferguson'], false, true),
   
  ('New Holland Transmission Belt', 'Durable transmission belt for New Holland equipment', 'NH-TB-004', 'New Holland', 125.50, 40,
   (SELECT id FROM categories WHERE name ILIKE '%belt%' OR name ILIKE '%transmission%' LIMIT 1),
   (SELECT id FROM user_profiles WHERE role = 'vendor' LIMIT 1),
   '84477891', 'NH-TB-004B', 'new', '12 months', 1.2, '120x3x1 cm',
   ARRAY['New Holland T4 Series', 'New Holland T5 Series'], 
   '{"length": "120cm", "width": "3cm", "material": "rubber"}',
   ARRAY['/assets/Newtractor4.png'], ARRAY['belt', 'transmission', 'new-holland'], false, true),
   
  ('International Harvester Alternator', 'High-output alternator for IH tractors', 'IH-ALT-005', 'International Harvester', 189.99, 30,
   (SELECT id FROM categories WHERE name ILIKE '%electrical%' OR name ILIKE '%alternator%' LIMIT 1),
   (SELECT id FROM user_profiles WHERE role = 'vendor' LIMIT 1),
   '87682323', 'IH-ALT-005C', 'remanufactured', '12 months', 8.5, '25x20x15 cm',
   ARRAY['Case IH Magnum Series', 'Case IH Puma Series'], 
   '{"voltage": "12V", "amperage": "160A", "rotation": "clockwise"}',
   ARRAY['/assets/Newtractor5.png'], ARRAY['electrical', 'alternator', 'case-ih'], true, true);

-- Enable real-time for user_settings
ALTER PUBLICATION supabase_realtime ADD TABLE user_settings;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_spare_parts_vendor_category ON spare_parts(vendor_id, category_id);
CREATE INDEX IF NOT EXISTS idx_spare_parts_featured ON spare_parts(featured, is_active);
CREATE INDEX IF NOT EXISTS idx_spare_parts_search ON spare_parts USING gin((name || ' ' || description || ' ' || brand));

-- Force schema reload
NOTIFY pgrst, 'reload schema';