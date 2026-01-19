-- Cart Architecture Fix v3: Robust Backfill + Constraints
-- Run this in Supabase Dashboard -> SQL Editor

BEGIN;

-- 1.1 Auto-Create user_profiles on Signup
-- We use ON CONFLICT (user_id) because that's the strict constraint we hit.
-- If user_profiles_user_id_key exists, this works.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, user_id, email, role, created_at)
  VALUES (new.id, new.id, new.email, 'customer', now())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 1.1b Backfill existing users into user_profiles
-- SAFE BACKFILL: Use WHERE NOT EXISTS to avoid unique violations on user_id
INSERT INTO public.user_profiles (id, user_id, email, role, created_at)
SELECT id, id, email, 'customer', now()
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_profiles up WHERE up.user_id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- 1.2 Allow Guest Activity Logs (make user_id nullable)
ALTER TABLE activity_logs ALTER COLUMN user_id DROP NOT NULL;

-- 1.3 Enforce One Cart Per Auth User (Partial Unique Index)
ALTER TABLE carts DROP CONSTRAINT IF EXISTS carts_user_id_key;
DROP INDEX IF EXISTS one_cart_per_user;
CREATE UNIQUE INDEX one_cart_per_user ON carts(user_id) WHERE user_id IS NOT NULL;

COMMIT;
