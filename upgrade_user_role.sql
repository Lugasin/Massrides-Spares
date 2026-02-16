-- Upgrade mambwemwila1@gmail.com to vendor role
UPDATE public.user_profiles
SET role = 'vendor', is_verified = true
WHERE email = 'mambwemwila1@gmail.com';

-- Verify the update
SELECT user_id, email, full_name, role, is_verified
FROM public.user_profiles
WHERE email = 'mambwemwila1@gmail.com';