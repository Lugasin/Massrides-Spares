/*
  # Create ads table for vendor advertisements

  1. New Tables
    - `ads`
      - `id` (uuid, primary key)
      - `vendor_id` (uuid, references user_profiles)
      - `title` (text)
      - `description` (text)
      - `image_url` (text)
      - `target_url` (text)
      - `ad_type` (text)
      - `status` (text)
      - `start_date` (timestamp)
      - `end_date` (timestamp)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `ads` table
    - Add policy for vendors to manage their own ads
    - Add policy for public to read active ads
*/

CREATE TABLE IF NOT EXISTS ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  image_url text,
  target_url text,
  ad_type text DEFAULT 'banner',
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  start_date timestamptz DEFAULT now(),
  end_date timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors can manage own ads"
  ON ads
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.id = ads.vendor_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.uid() 
      AND user_profiles.id = ads.vendor_id
    )
  );

CREATE POLICY "Public can read active ads"
  ON ads
  FOR SELECT
  TO public
  USING (
    status = 'active' 
    AND start_date <= now() 
    AND (end_date IS NULL OR end_date > now())
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ads_vendor_id ON ads(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ads_status ON ads(status);
CREATE INDEX IF NOT EXISTS idx_ads_dates ON ads(start_date, end_date);