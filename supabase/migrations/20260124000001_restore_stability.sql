-- RESTORATION MIGRATION: Re-applying lost stability fixes
-- Includes: Notifications, Logs, Universal RLS, Profile Repairs

BEGIN;

-- ==========================================
-- 1. NOTIFICATIONS & LOGS
-- ==========================================
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.notifications TO authenticated;
DROP POLICY IF EXISTS "Users manage own notifications" ON public.notifications;
CREATE POLICY "Users manage own notifications" ON public.notifications FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    action text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.activity_logs TO authenticated;
DROP POLICY IF EXISTS "insert logs" ON public.activity_logs;
CREATE POLICY "insert logs" ON public.activity_logs FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "users read own logs" ON public.activity_logs;
CREATE POLICY "users read own logs" ON public.activity_logs FOR SELECT USING (auth.uid() = user_id);

-- ==========================================
-- 2. UNIVERSAL RLS (Wishlists, Carts, Orders)
-- ==========================================
-- Wishlists
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.wishlists TO authenticated;
DROP POLICY IF EXISTS "users read own wishlist" ON public.wishlists;
CREATE POLICY "users read own wishlist" ON public.wishlists FOR ALL USING (auth.uid() = user_id);

-- Carts (Flattened)
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.cart_items TO authenticated;
DROP POLICY IF EXISTS "Users manage own cart items" ON public.cart_items;
CREATE POLICY "Users manage own cart items" ON public.cart_items FOR ALL USING (user_id = auth.uid());

-- Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.orders TO authenticated;
DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING (user_id = auth.uid());
DROP POLICY IF EXISTS "Users create orders" ON public.orders;
CREATE POLICY "Users create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- 3. PROFILES & ROLES REPAIR
-- ==========================================
-- Add Email Column if missing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;

-- Fix Role Constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('customer', 'vendor', 'admin', 'super_admin', 'guest'));

-- Backfill Profiles
INSERT INTO public.profiles (id, email, role, full_name)
SELECT 
    au.id, 
    au.email, 
    'customer',
    COALESCE(au.raw_user_meta_data->>'full_name', 'User')
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;

-- Promote Super Admin
UPDATE public.profiles
SET role = 'super_admin'
FROM auth.users
WHERE profiles.id = auth.users.id
AND auth.users.email = 'Mambwemwila1@gmail.com';

COMMIT;
