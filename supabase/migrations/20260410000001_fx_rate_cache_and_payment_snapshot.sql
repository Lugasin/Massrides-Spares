create table if not exists fx_rates (
  id bigserial primary key,
  base_currency text not null,
  quote_currency text not null,
  provider text not null,
  rate numeric(18,8) not null,
  rate_date text,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz,
  source_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists fx_rates_base_quote_key
  on fx_rates (base_currency, quote_currency);

alter table fx_rates enable row level security;

alter table payments
  add column if not exists base_currency text default 'USD',
  add column if not exists quote_currency text default 'ZMW',
  add column if not exists exchange_rate numeric(18,8),
  add column if not exists fx_rate_provider text,
  add column if not exists fx_rate_source text,
  add column if not exists fx_rate_fetched_at timestamptz,
  add column if not exists fx_rate_locked_at timestamptz,
  add column if not exists amount_usd numeric(12,2),
  add column if not exists amount_zmw numeric(12,2),
  add column if not exists fx_rate_payload jsonb;
