-- Restore user_settings table
-- Resolves frontend 404 errors

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    theme text DEFAULT 'light',
    currency text DEFAULT 'ZMW',
    language text DEFAULT 'en',
    timezone text DEFAULT 'Africa/Lusaka',
    email_notifications boolean DEFAULT true,
    push_notifications boolean DEFAULT true,
    marketing_emails boolean DEFAULT false,
    order_updates boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT user_settings_user_id_key UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can manage their own settings" ON public.user_settings;
CREATE POLICY "Users can manage their own settings" ON public.user_settings
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Grants
GRANT ALL ON public.user_settings TO authenticated, service_role;

COMMIT;
