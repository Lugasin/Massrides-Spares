/*
  # Create company partners table

  1. New Tables
    - `company_partners`
      - `id` (uuid, primary key)
      - `name` (text)
      - `logo_url` (text)
      - `website_url` (text)
      - `description` (text)
      - `display_order` (integer)
      - `active` (boolean)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `company_partners` table
    - Add policy for public to read active partners
    - Add policy for admins to manage partners
*/

CREATE TABLE IF NOT EXISTS company_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  website_url text,
  description text,
  display_order integer DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE company_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active partners"
  ON company_partners
  FOR SELECT
  TO public
  USING (active = true);

CREATE POLICY "Admins can manage partners"
  ON company_partners
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Insert default partners
INSERT INTO company_partners (name, logo_url, website_url, description, display_order) VALUES
  ('John Deere', 'https://logos-world.net/wp-content/uploads/2020/04/John-Deere-Logo.png', 'https://www.deere.com', 'Leading manufacturer of agricultural machinery', 1),
  ('Case IH', 'https://logos-world.net/wp-content/uploads/2020/04/Case-IH-Logo.png', 'https://www.caseih.com', 'Global leader in agricultural equipment', 2),
  ('New Holland', 'https://logos-world.net/wp-content/uploads/2020/04/New-Holland-Logo.png', 'https://www.newholland.com', 'Agricultural and construction equipment', 3),
  ('Kubota', 'https://logos-world.net/wp-content/uploads/2020/04/Kubota-Logo.png', 'https://www.kubota.com', 'Compact and utility tractor specialist', 4),
  ('Massey Ferguson', 'https://1000logos.net/wp-content/uploads/2020/09/Massey-Ferguson-Logo.png', 'https://www.masseyferguson.com', 'Global agricultural equipment brand', 5)
ON CONFLICT (name) DO NOTHING;