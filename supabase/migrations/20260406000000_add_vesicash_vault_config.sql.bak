/*
  # Vesicash Vault Config

  This migration enables the Vault extension and exposes a narrow
  SECURITY DEFINER helper that lets Edge Functions read Vesicash
  credentials from encrypted Vault secrets.

  Expected Vault secret names:
  - vesicash_secret_key
  - vesicash_public_key
  - vesicash_webhook_secret
  - vesicash_api_key
  - vesicash_api_url
  - vesicash_country_id
  - vesicash_webhook_url
  - vesicash_refund_webhook_url
*/

create extension if not exists vault with schema vault;

create or replace function public.get_vesicash_config()
returns jsonb
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  config jsonb;
begin
  select jsonb_build_object(
    'secret_key', (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'vesicash_secret_key'
      order by updated_at desc
      limit 1
    ),
    'public_key', (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'vesicash_public_key'
      order by updated_at desc
      limit 1
    ),
    'webhook_secret', (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'vesicash_webhook_secret'
      order by updated_at desc
      limit 1
    ),
    'api_key', (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'vesicash_api_key'
      order by updated_at desc
      limit 1
    ),
    'api_url', (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'vesicash_api_url'
      order by updated_at desc
      limit 1
    ),
    'country_id', (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'vesicash_country_id'
      order by updated_at desc
      limit 1
    ),
    'webhook_url', (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'vesicash_webhook_url'
      order by updated_at desc
      limit 1
    ),
    'refund_webhook_url', (
      select decrypted_secret
      from vault.decrypted_secrets
      where name = 'vesicash_refund_webhook_url'
      order by updated_at desc
      limit 1
    )
  )
  into config;

  return config;
end;
$$;

revoke all on function public.get_vesicash_config() from public;
revoke all on function public.get_vesicash_config() from anon;
revoke all on function public.get_vesicash_config() from authenticated;
grant execute on function public.get_vesicash_config() to service_role;
