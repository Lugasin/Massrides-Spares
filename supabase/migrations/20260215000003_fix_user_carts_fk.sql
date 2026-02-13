-- Fix user_carts foreign key to reference auth.users instead of user_profiles (Rule 3.1)
-- This prevents "violates foreign key constraint" errors when a user exists in Auth but not Profiles.

ALTER TABLE public.user_carts
DROP CONSTRAINT IF EXISTS user_carts_user_id_fkey;

ALTER TABLE public.user_carts
ADD CONSTRAINT user_carts_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Also verify RLS (good practice)
ALTER TABLE public.user_carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own cart" ON public.user_carts;
CREATE POLICY "Users can view own cart" ON public.user_carts
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own cart" ON public.user_carts;
CREATE POLICY "Users can create own cart" ON public.user_carts
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());
