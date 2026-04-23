-- Migration: Clear Dummy Vesicash Settings
-- This deletes any placeholder configuration left over from initial setup
-- so the edge functions cleanly fall back to the secure Supabase Vault/Deno.env secrets.

BEGIN;

DELETE FROM public.system_settings 
WHERE key LIKE 'vesicash_%';

-- Add a log record just in case
INSERT INTO public.financial_audit_logs (
    event_type,
    entity_type,
    entity_id,
    metadata
) VALUES (
    'system_settings_cleared',
    'system_settings',
    'vesicash_api',
    '{"reason": "Cleared dummy configurations to allow secure vault fallback"}'::jsonb
);

COMMIT;
