/*
  # Create activity logs table

  1. New Tables
    - `activity_logs` - Track all user actions and system events

  2. Security
    - Enable RLS on activity_logs table
    - Add policies for admin access and user own logs

  3. Indexes
    - Add indexes for efficient querying by user_id and action_type
*/

CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  action_details jsonb DEFAULT '{}',
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policies for activity logs
CREATE POLICY "Admins can view all activity logs"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (has_role(uid(), 'admin'::app_role) OR has_role(uid(), 'super_admin'::app_role));

CREATE POLICY "Users can view own activity logs"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles p
      WHERE p.id = activity_logs.user_id AND p.user_id = uid()
    )
  );

CREATE POLICY "System can insert activity logs"
  ON activity_logs
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);