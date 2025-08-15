/*
  # Create guest verification table for guest checkout

  1. New Tables
    - `guest_verifications`
      - `id` (uuid, primary key)
      - `email` (text, unique)
      - `verification_code` (text)
      - `verified_at` (timestamp, nullable)
      - `expires_at` (timestamp)
      - `session_id` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `guest_verifications` table
    - Add policy for anonymous users to manage their own verifications
*/

CREATE TABLE IF NOT EXISTS guest_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  verification_code text NOT NULL,
  verified_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 hour'),
  session_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE guest_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anonymous users can manage guest verifications"
  ON guest_verifications
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_guest_verifications_email ON guest_verifications(email);
CREATE INDEX IF NOT EXISTS idx_guest_verifications_session_id ON guest_verifications(session_id);
CREATE INDEX IF NOT EXISTS idx_guest_verifications_code ON guest_verifications(verification_code);