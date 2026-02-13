-- Migration: Grant access to user_settings
-- Fixes 401 Unauthorized on get-user-settings edge function

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_settings') THEN
    GRANT ALL ON public.user_settings TO authenticated;
  END IF;
END $$;
