
-- INSTRUCTIONS:
-- 1. Run this script in the Supabase SQL Editor.
-- 2. It will create dummy users in `auth.users` and their profiles in `public.user_profiles`.
-- 3. The passwords will be 'password123' for all users.
-- NOTE: Inserting directly into auth.users is restricted. 
-- WE RECOMMEND creating users via the Authentication > Users tab in Supabase Dashboard.
-- HOWEVER, if you want to seed ROLES for existing users or manual inserts, use the commands below.

-- OPTION A: If you have already created users in the Dashboard, update their roles here:
-- Replace 'USER_ID_HERE' with the actual UUID from the Authentication tab.

-- For Super Admin
-- UPDATE public.user_profiles SET role = 'super_admin', is_verified = true WHERE email = 'admin@example.com';

-- For Vendor
-- UPDATE public.user_profiles SET role = 'vendor', is_verified = true WHERE email = 'vendor@example.com';

-- OPTION B: Create entries in user_profiles manually (ONLY if you used the API/Dashboard to create auth users but the trigger failed)
-- This assumes the auth.users entry exists.

-- EXAMPLE of seeding logic if you run this in local dev with full admin rights:

/*
-- Insert a test profile linked to a fake ID (useful only if you are mocking auth or have a matching ID)
INSERT INTO public.user_profiles (user_id, email, full_name, role, is_verified)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'superadmin@example.com', 'Super Admin User', 'super_admin', true),
    ('00000000-0000-0000-0000-000000000002', 'vendor@example.com', 'John Vendor', 'vendor', true),
    ('00000000-0000-0000-0000-000000000003', 'customer@example.com', 'Jane Customer', 'customer', true)
ON CONFLICT (user_id) DO UPDATE 
SET role = EXCLUDED.role, is_verified = EXCLUDED.is_verified;
*/

-- IMPORTANT: The best way to specific test users is:
-- 1. Sign up manually in the app as:
--    - admin@massrides.com
--    - vendor@massrides.com
--    - customer@massrides.com
-- 2. Then RUN the following SQL to elevate their privileges:

UPDATE public.user_profiles 
SET role = 'super_admin', is_verified = true 
WHERE email = 'admin@massrides.com';

UPDATE public.user_profiles 
SET role = 'vendor', is_verified = true 
WHERE email = 'vendor@massrides.com';

-- Customer defaults to 'customer' so no update needed usually.

