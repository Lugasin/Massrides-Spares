/*
  # Create ads table for vendor advertisements

  1. New Tables
    - `ads` - Store vendor advertisements and promotional content

  2. Security
    - Enable RLS on ads table
    - Add policies for vendor and admin access

  3. Indexes
    - Add indexes for efficient querying
*/

CREATE TABLE IF NOT EXISTS ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text,
  target_url text,
  ad_type text DEFAULT 'banner',
  active boolean DEFAULT true,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  click_count integer DEFAULT 0,
  impression_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_ads_vendor_id ON ads(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ads_active ON ads(active);
CREATE INDEX IF NOT EXISTS idx_ads_ad_type ON ads(ad_type);

-- Enable RLS
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

-- Policies for ads
CREATE POLICY "Public can view active ads"
  ON ads
  FOR SELECT
  TO public
  USING (active = true);

CREATE POLICY "Vendors can manage own ads"
  ON ads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles p
      WHERE p.id = ads.vendor_id AND p.user_id = uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles p
      WHERE p.id = ads.vendor_id AND p.user_id = uid()
    )
  );

CREATE POLICY "Admins can manage all ads"
  ON ads
  FOR ALL
  TO authenticated
  USING (has_role(uid(), 'admin'::app_role) OR has_role(uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(uid(), 'admin'::app_role) OR has_role(uid(), 'super_admin'::app_role));

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_ads_updated_at'
  ) THEN
    CREATE TRIGGER trg_ads_updated_at
      BEFORE UPDATE ON ads
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;