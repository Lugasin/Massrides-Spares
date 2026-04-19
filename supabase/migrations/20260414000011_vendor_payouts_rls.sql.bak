-- RLS policies for vendor_payouts table
-- Allow admins to view and manage vendor payouts

-- Enable RLS
ALTER TABLE vendor_payouts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they cause issues
DROP POLICY IF EXISTS "Admins can view vendor payouts" ON vendor_payouts;
DROP POLICY IF EXISTS "Service role full access to vendor_payouts" ON vendor_payouts;

-- Create policy for admins to view all payouts
CREATE POLICY "Admins can view vendor payouts" ON vendor_payouts
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = vendor_payouts.vendor_id
    AND EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.user_id = auth.users.id 
      AND user_profiles.role IN ('admin', 'super_admin', 'support')
    )
  )
);

-- Allow service_role full access
CREATE POLICY "Service role full access to vendor_payouts" ON vendor_payouts
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT SELECT, UPDATE, INSERT ON vendor_payouts TO authenticated;
GRANT ALL ON vendor_payouts TO service_role;
