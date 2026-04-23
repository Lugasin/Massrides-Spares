-- Migration: Fix Permissions and Vault RPC
-- Date: 2026-04-20
-- Description: Grants sequence usage to user roles and updates Vesicash config retrieval to support Supabase Vault.

BEGIN;

-- 1. Grant USAGE on all sequences to authenticated and anon roles
-- This fixes the "permission denied for sequence carts_id_seq" error
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

-- 2. Update the Vesicash Configuration RPC to check for Vault Secrets
-- We use SECURITY DEFINER to ensure the function has permission to read from the vault schema.
CREATE OR REPLACE FUNCTION public.get_vesicash_config()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config jsonb;
    v_vault_config jsonb;
BEGIN
    -- A. Fetch non-sensitive settings from public.system_settings
    SELECT jsonb_object_agg(key, value)
    INTO v_config
    FROM public.system_settings
    WHERE key IN (
        'vesicash_api_url',
        'vesicash_webhook_url',
        'vesicash_refund_webhook_url',
        'vesicash_country_id'
    );

    -- B. Attempt to fetch sensitive keys from Supabase Vault if available
    -- We use a TRY...CATCH pattern or check for existence to avoid errors if the vault extension is missing.
    BEGIN
        SELECT jsonb_object_agg(name, secret)
        INTO v_vault_config
        FROM vault.decrypted_secrets
        WHERE name IN (
            'vesicash_secret_key',
            'vesicash_public_key',
            'vesicash_api_key',
            'vesicash_webhook_secret'
        );
    EXCEPTION WHEN OTHERS THEN
        v_vault_config := '{}'::jsonb;
    END;

    -- C. Merge results, prioritizing Vault over system_settings for sensitive keys
    -- If Vault is empty (or has no matches), fall back to system_settings for backward compatibility
    RETURN jsonb_build_object(
        'api_url', COALESCE(v_config->>'vesicash_api_url', 'https://api.mor.vesicash.com/v1'),
        'webhook_url', v_config->>'vesicash_webhook_url',
        'refund_webhook_url', v_config->>'vesicash_refund_webhook_url',
        'secret_key', COALESCE(v_vault_config->>'vesicash_secret_key', (SELECT value->>0 FROM public.system_settings WHERE key = 'vesicash_secret_key')),
        'public_key', COALESCE(v_vault_config->>'vesicash_public_key', (SELECT value->>0 FROM public.system_settings WHERE key = 'vesicash_public_key')),
        'webhook_secret', COALESCE(v_vault_config->>'vesicash_webhook_secret', (SELECT value->>0 FROM public.system_settings WHERE key = 'vesicash_webhook_secret')),
        'api_key', COALESCE(v_vault_config->>'vesicash_api_key', (SELECT value->>0 FROM public.system_settings WHERE key = 'vesicash_api_key')),
        'country_id', COALESCE(v_config->>'vesicash_country_id', 'ZM')
    );
END;
$$;

-- Ensure Edge Functions can call this
GRANT EXECUTE ON FUNCTION public.get_vesicash_config() TO authenticated, service_role;

COMMIT;
