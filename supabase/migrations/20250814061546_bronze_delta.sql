/*
  # Create company partners table

  1. New Tables
    - `company_partners` - Store partner company information for display

  2. Security
    - Enable RLS on company_partners table
    - Add policies for public read and admin write

  3. Indexes
    - Add indexes for efficient querying
*/

CREATE TABLE IF NOT EXISTS company_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  website_url text,
  description text,
  display_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_company_partners_active ON company_partners(active);
CREATE INDEX IF NOT EXISTS idx_company_partners_display_order ON company_partners(display_order);

-- Enable RLS
ALTER TABLE company_partners ENABLE ROW LEVEL SECURITY;

-- Policies for company partners
CREATE POLICY "Public can view active partners"
  ON company_partners
  FOR SELECT
  TO public
  USING (active = true);

CREATE POLICY "Admins can manage partners"
  ON company_partners
  FOR ALL
  TO authenticated
  USING (has_role(uid(), 'admin'::app_role) OR has_role(uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(uid(), 'admin'::app_role) OR has_role(uid(), 'super_admin'::app_role));

-- Create updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_company_partners_updated_at'
  ) THEN
    CREATE TRIGGER trg_company_partners_updated_at
      BEFORE UPDATE ON company_partners
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;