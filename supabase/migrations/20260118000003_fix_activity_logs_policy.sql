-- Migration to fix activity_logs RLS policy
-- Allow authenticated users to insert logs even if user_id doesn't match auth.uid()
-- This is necessary for system actions logged by cloud functions on behalf of users
-- Also allow anon inserts for guest checkout flows

BEGIN;

  -- Drop existing restrictive policy if it exists
  DROP POLICY IF EXISTS "Users can insert their own logs" ON activity_logs;
  DROP POLICY IF EXISTS "Enable insert for authenticated users" ON activity_logs;

  -- Create a new permissive insert policy for authenticated users
  -- This allows creating logs for any user_id (needed for admin actions / system logs)
  CREATE POLICY "Enable insert for authenticated users"
  ON activity_logs
  FOR INSERT
  To authenticated
  WITH CHECK (true);

  -- Create a policy for anon users (guest checkout, login attempts)
  CREATE POLICY "Enable insert for anon users"
  ON activity_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);

  -- Ensure read access is still restricted to admins or own logs
  DROP POLICY IF EXISTS "Users can view their own logs" ON activity_logs;
  CREATE POLICY "Users can view their own logs"
  ON activity_logs
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id 
    OR 
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

COMMIT;
