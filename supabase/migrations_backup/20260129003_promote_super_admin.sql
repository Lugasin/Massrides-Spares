-- Migration: Promote user to Super Admin
-- Target: mambwemwila1@gmail.com

BEGIN;

-- Update both profiles and user_profiles to ensure consistency across the system
UPDATE public.profiles
SET role = 'super_admin'
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'mambwemwila1@gmail.com'
);

-- Note: user_profiles uses user_id as the FK
UPDATE public.user_profiles
SET role = 'super_admin'
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'mambwemwila1@gmail.com'
);

COMMIT;
