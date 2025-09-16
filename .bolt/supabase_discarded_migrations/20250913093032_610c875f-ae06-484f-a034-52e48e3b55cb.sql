-- Create idempotent migration to add mock product data and fix schema
-- First, ensure spare_parts table has all necessary columns
DO $$ 
BEGIN
  -- Add columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spare_parts' AND column_name = 'technical_specs') THEN
    ALTER TABLE public.spare_parts ADD COLUMN technical_specs JSONB DEFAULT '{}';
  END IF;
END $$;

-- Insert mock data into spare_parts (idempotent - only insert if not exists)
INSERT INTO public.spare_parts (
  id, name, price, description, category_id, brand, part_number, 
  compatibility, warranty, stock_quantity, images, is_active, featured,
  availability_status, condition, technical_specs, created_at, updated_at
) VALUES 
-- John Deere Engine Oil Filter
(
  gen_random_uuid(),
  'John Deere Engine Oil Filter',
  45.00,
  'Genuine John Deere engine oil filter for optimal engine protection and performance.',
  (SELECT id FROM categories WHERE name = 'Engine Parts' LIMIT 1),
  'John Deere',
  'RE504836',
  ARRAY['6M Series', '7R Series', '8R Series'],
  '12 months',
  25,
  ARRAY['/assets/tractor-plowing.jpg'],
  true,
  true,
  'in_stock',
  'new',
  '{"filtration": "High", "installation": "Easy", "quality": "OEM"}',
  now(),
  now()
),
-- Hydraulic Pump Assembly
(
  gen_random_uuid(),
  'Hydraulic Pump Assembly',
  850.00,
  'High-performance hydraulic pump assembly for agricultural equipment.',
  (SELECT id FROM categories WHERE name = 'Hydraulic Parts' LIMIT 1),
  'Parker',
  'PGP511A0280',
  ARRAY['Case IH', 'New Holland', 'John Deere'],
  '24 months',
  15,
  ARRAY['/assets/planter-seeding.jpg'],
  true,
  true,
  'in_stock',
  'new',
  '{"pressure": "High", "durability": "Heavy Duty", "warranty": "2 Year"}',
  now(),
  now()
),
-- Alternator 12V 95A
(
  gen_random_uuid(),
  'Alternator 12V 95A',
  285.00,
  'Heavy-duty alternator for Case IH tractors and combines.',
  (SELECT id FROM categories WHERE name = 'Electrical Parts' LIMIT 1),
  'Case IH',
  '87540915',
  ARRAY['Magnum Series', 'Puma Series', 'Farmall Series'],
  '18 months',
  20,
  ARRAY['/assets/hero-combine.jpg'],
  true,
  true,
  'in_stock',
  'new',
  '{"voltage": "12V", "amperage": "95A", "weather_resistance": "Yes"}',
  now(),
  now()
),
-- Radiator Assembly
(
  gen_random_uuid(),
  'Radiator Assembly',
  420.00,
  'High-quality radiator assembly for Kubota tractors.',
  (SELECT id FROM categories WHERE name = 'Cooling System' LIMIT 1),
  'Kubota',
  '1C010-17114',
  ARRAY['M Series', 'L Series', 'Grand L Series'],
  '12 months',
  12,
  ARRAY['/assets/irrigation-aerial.jpg'],
  true,
  false,
  'in_stock',
  'new',
  '{"core": "Aluminum", "tank": "Plastic", "pressure_tested": "Yes"}',
  now(),
  now()
),
-- Fuel Injection Pump
(
  gen_random_uuid(),
  'Fuel Injection Pump',
  1250.00,
  'Remanufactured fuel injection pump for Massey Ferguson tractors.',
  (SELECT id FROM categories WHERE name = 'Fuel System' LIMIT 1),
  'Massey Ferguson',
  '3641832M91',
  ARRAY['MF 6400', 'MF 7400', 'MF 8400'],
  '12 months',
  8,
  ARRAY['/assets/farmer-tractor.jpg'],
  true,
  false,
  'in_stock',
  'remanufactured',
  '{"precision": "High", "testing": "Complete", "core_exchange": "Required"}',
  now(),
  now()
),
-- Brake Pad Set
(
  gen_random_uuid(),
  'Brake Pad Set',
  95.00,
  'High-performance brake pads for Fendt tractors.',
  (SELECT id FROM categories WHERE name = 'Brake Parts' LIMIT 1),
  'Fendt',
  'F916200060110',
  ARRAY['Fendt 700', 'Fendt 800', 'Fendt 900'],
  '6 months',
  30,
  ARRAY['/assets/tractor-wheel.jpg'],
  true,
  false,
  'in_stock',
  'new',
  '{"compound": "Ceramic", "dust": "Low", "operation": "Quiet"}',
  now(),
  now()
)
ON CONFLICT (part_number) DO NOTHING;

-- Create TJ security monitoring tables
CREATE TABLE IF NOT EXISTS public.tj_security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES public.user_profiles(id),
  transaction_id text,
  amount numeric,
  ip_address inet,
  user_agent text,
  risk_score integer DEFAULT 0,
  blocked boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on security logs
ALTER TABLE public.tj_security_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for security logs (super admins only)
CREATE POLICY "Super admins can view security logs" ON public.tj_security_logs
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role = 'super_admin'
  )
);

-- Create system monitoring table for real-time metrics
CREATE TABLE IF NOT EXISTS public.system_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_unit text,
  tags jsonb DEFAULT '{}',
  recorded_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on system metrics
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

-- Policy for system metrics (super admins only)
CREATE POLICY "Super admins can view system metrics" ON public.system_metrics
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role = 'super_admin'
  )
);

-- Enable realtime for security and monitoring
ALTER PUBLICATION supabase_realtime ADD TABLE public.tj_security_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_profiles;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tj_security_logs_event_type ON public.tj_security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_tj_security_logs_created_at ON public.tj_security_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name_time ON public.system_metrics(metric_name, recorded_at);
CREATE INDEX IF NOT EXISTS idx_spare_parts_search ON public.spare_parts USING gin(to_tsvector('english', name || ' ' || description));

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type text,
  p_user_id uuid DEFAULT NULL,
  p_transaction_id text DEFAULT NULL,
  p_amount numeric DEFAULT NULL,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_risk_score integer DEFAULT 0,
  p_blocked boolean DEFAULT false,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.tj_security_logs (
    event_type, user_id, transaction_id, amount, ip_address,
    user_agent, risk_score, blocked, metadata
  ) VALUES (
    p_event_type, p_user_id, p_transaction_id, p_amount, p_ip_address,
    p_user_agent, p_risk_score, p_blocked, p_metadata
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;