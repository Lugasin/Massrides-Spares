-- Assign all unassigned (or all) products to the specific vendor email
-- Replace 'vendor@massrides.com' with the email you are currently using if different!

UPDATE public.products
SET vendor_id = (SELECT id FROM public.user_profiles WHERE email LIKE 'vendor%@massrides.com' LIMIT 1)
WHERE vendor_id IS NULL OR vendor_id != (SELECT id FROM public.user_profiles WHERE email LIKE 'vendor%@massrides.com' LIMIT 1);

-- Optionally also update the inventory records to match
UPDATE public.inventory
SET vendor_id = (SELECT id FROM public.user_profiles WHERE email LIKE 'vendor%@massrides.com' LIMIT 1)
WHERE vendor_id IS NULL OR vendor_id != (SELECT id FROM public.user_profiles WHERE email LIKE 'vendor%@massrides.com' LIMIT 1);
