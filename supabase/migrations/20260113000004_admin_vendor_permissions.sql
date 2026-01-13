-- Enable Admin and Vendor to update user profiles (Role Management)

-- 1. Ensure 'role' column exists (Missing in original schema)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN 
        ALTER TABLE profiles ADD COLUMN role text DEFAULT 'customer';
        
        -- Backfill from metadata if available, otherwise 'customer'
        UPDATE profiles 
        SET role = COALESCE(metadata->>'role', 'customer')
        WHERE role IS NULL;
    END IF; 
END $$;

-- 2. Create Index
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 3. Drop existing policies
DROP POLICY IF EXISTS "profiles_admin_update" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_select" ON profiles;

-- 4. Create Update Policy
CREATE POLICY "profiles_admin_update" ON profiles FOR UPDATE
USING (
  exists (
    select 1 from profiles p
    where p.id = auth.uid()
    and p.role IN ('super_admin', 'admin', 'vendor')
  )
);

-- 5. Create Select Policy (Management View)
CREATE POLICY "profiles_admin_select" ON profiles FOR SELECT
USING (
  exists (
    select 1 from profiles p
    where p.id = auth.uid()
    and p.role IN ('super_admin', 'admin', 'vendor')
  )
);
