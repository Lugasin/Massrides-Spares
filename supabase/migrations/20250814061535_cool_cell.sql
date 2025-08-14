/*
  # Create guest verification table

  1. New Tables
    - `guest_verifications` - Store email verification codes for guest checkout

  2. Security
    - Enable RLS on guest_verifications table
    - Add policies for guest access

  3. Indexes
    - Add indexes for efficient querying
*/

CREATE TABLE IF NOT EXISTS guest_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  verification_code text NOT NULL,
  session_id text NOT NULL,
  verified_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_guest_verifications_email ON guest_verifications(email);
CREATE INDEX IF NOT EXISTS idx_guest_verifications_session_id ON guest_verifications(session_id);
CREATE INDEX IF NOT EXISTS idx_guest_verifications_code ON guest_verifications(verification_code);

-- Enable RLS
ALTER TABLE guest_verifications ENABLE ROW LEVEL SECURITY;

-- Policies for guest verifications
CREATE POLICY "Anyone can manage guest verifications"
  ON guest_verifications
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);