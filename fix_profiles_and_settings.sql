-- 1. Create a profile for any user who doesn't have one
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'customer'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- 2. Create default settings for everyone
INSERT INTO public.user_settings (user_id, theme, currency)
SELECT id, 'light', 'ZMW'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_settings);
