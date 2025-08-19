/*
  # Create user_settings table

  1. New Tables
    - `user_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to user_profiles)
      - `email_notifications` (boolean, default true)
      - `push_notifications` (boolean, default true)
      - `marketing_emails` (boolean, default false)
      - `order_updates` (boolean, default true)
      - `theme` (text, default 'system')
      - `language` (text, default 'en')
      - `currency` (text, default 'USD')
      - `timezone` (text, default 'Africa/Lusaka')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `user_settings` table
    - Add policy for users to manage their own settings
*/

CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  marketing_emails boolean DEFAULT false,
  order_updates boolean DEFAULT true,
  theme text DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  language text DEFAULT 'en',
  currency text DEFAULT 'USD',
  timezone text DEFAULT 'Africa/Lusaka',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own settings"
  ON user_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = (SELECT user_id FROM user_profiles WHERE id = user_settings.user_id));

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();