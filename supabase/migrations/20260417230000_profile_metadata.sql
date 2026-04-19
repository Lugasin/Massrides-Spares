-- Migration: Add metadata payload for vendor payout details defensively
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles') THEN
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
  END IF;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;
