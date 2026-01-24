-- FIX: Add missing 'updated_at' column to profiles
-- This fixes the "record new has no field updated_at" error during login/upsert

BEGIN;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Optional: Create trigger to auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

COMMIT;
