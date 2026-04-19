-- Ensure carts table exists and has proper permissions
-- This stops the 401 Unauthorized for cart syncs by validating table permissions

BEGIN;

CREATE TABLE IF NOT EXISTS public.carts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    guest_token text,
    items jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT carts_pkey PRIMARY KEY (id)
);

ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own carts" ON public.carts;
CREATE POLICY "Users can manage their own carts" ON public.carts
    FOR ALL
    USING (
        auth.uid() = user_id OR
        (user_id IS NULL AND guest_token IS NOT NULL) OR
        public.is_admin_or_super_admin(auth.uid())
    )
    WITH CHECK (
        auth.uid() = user_id OR
        (user_id IS NULL AND guest_token IS NOT NULL) OR
        public.is_admin_or_super_admin(auth.uid())
    );

GRANT ALL ON public.carts TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.carts TO anon, authenticated;

COMMIT;
