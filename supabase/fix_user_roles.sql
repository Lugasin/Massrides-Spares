
-- 1. Confirm all emails in auth.users (Fixes "Email not confirmed" error)
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email LIKE '%@massrides.com';

-- 2. Force update roles in public.user_profiles (Fixes "Guest" role in dashboard)
-- Super Admin
UPDATE public.user_profiles
SET role = 'super_admin'
WHERE email LIKE 'super_admin_%@massrides.com' OR email = 'admin@massrides.com';

-- Vendor
UPDATE public.user_profiles
SET role = 'vendor'
WHERE email LIKE 'vendor_%@massrides.com' OR email = 'vendor@massrides.com';

-- Customer
UPDATE public.user_profiles
SET role = 'customer'
WHERE email LIKE 'customer_%@massrides.com' OR email = 'customer@massrides.com';

-- 3. Verify the updates
SELECT up.email, up.role, au.email_confirmed_at 
FROM public.user_profiles up
JOIN auth.users au ON up.user_id = au.id
WHERE up.email LIKE '%@massrides.com';
