-- Fix missing columns on payments table
-- Adds completed_at to align with the frontend select queries and stop 400 Bad Request errors

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'completed_at') THEN
        ALTER TABLE public.payments ADD COLUMN completed_at timestamptz;
    END IF;
END $$;

COMMIT;
