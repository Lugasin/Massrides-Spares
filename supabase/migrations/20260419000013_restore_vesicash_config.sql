-- Restore Vesicash Configuration RPC
-- Allows Edge Functions to securely retrieve API keys from the database system_settings

BEGIN;

CREATE OR REPLACE FUNCTION public.get_vesicash_config()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_config jsonb;
BEGIN
    SELECT jsonb_object_agg(key, value)
    INTO v_config
    FROM public.system_settings
    WHERE key IN (
        'vesicash_api_url',
        'vesicash_webhook_url',
        'vesicash_refund_webhook_url',
        'vesicash_secret_key',
        'vesicash_public_key',
        'vesicash_webhook_secret',
        'vesicash_api_key',
        'vesicash_country_id'
    );

    -- Map database keys to expected JSON keys in the JS config loader
    RETURN jsonb_build_object(
        'api_url', v_config->>'vesicash_api_url',
        'webhook_url', v_config->>'vesicash_webhook_url',
        'refund_webhook_url', v_config->>'vesicash_refund_webhook_url',
        'secret_key', v_config->>'vesicash_secret_key',
        'public_key', v_config->>'vesicash_public_key',
        'webhook_secret', v_config->>'vesicash_webhook_secret',
        'api_key', v_config->>'vesicash_api_key',
        'country_id', v_config->>'vesicash_country_id'
    );
END;
$$;

-- Grant execution to authenticated users (Edge Functions)
GRANT EXECUTE ON FUNCTION public.get_vesicash_config() TO authenticated, service_role;

COMMIT;
