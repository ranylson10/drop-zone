create extension if not exists supabase_vault with schema vault;

create table if not exists public.payment_provider_settings (
  provider text primary key check (provider in ('mercadopago', 'paypal')),
  enabled boolean not null default false,
  environment text not null default 'sandbox' check (environment in ('sandbox', 'production')),
  public_config jsonb not null default '{}'::jsonb,
  secret_refs jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_provider_settings enable row level security;
revoke all on public.payment_provider_settings from anon, authenticated;
grant select, insert, update on public.payment_provider_settings to service_role;

create or replace function public.admin_set_payment_provider_config(
  p_provider text,
  p_enabled boolean,
  p_environment text,
  p_public_config jsonb default '{}'::jsonb,
  p_secrets jsonb default '{}'::jsonb,
  p_updated_by uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  v_provider text := lower(trim(coalesce(p_provider, '')));
  v_environment text := lower(trim(coalesce(p_environment, 'sandbox')));
  v_secret_refs jsonb := '{}'::jsonb;
  v_key text;
  v_value text;
  v_secret_id uuid;
  v_secret_name text;
begin
  if v_provider not in ('mercadopago', 'paypal') then
    raise exception 'Provedor de pagamento invalido.';
  end if;

  if v_environment not in ('sandbox', 'production') then
    raise exception 'Ambiente de pagamento invalido.';
  end if;

  select coalesce(secret_refs, '{}'::jsonb)
    into v_secret_refs
  from public.payment_provider_settings
  where provider = v_provider;

  v_secret_refs := coalesce(v_secret_refs, '{}'::jsonb);

  for v_key, v_value in
    select key, value
    from jsonb_each_text(coalesce(p_secrets, '{}'::jsonb))
  loop
    v_value := trim(coalesce(v_value, ''));
    if v_value = '' then
      continue;
    end if;

    v_secret_name := format('payment_provider_%s_%s', v_provider, v_key);

    select id into v_secret_id
    from vault.secrets
    where name = v_secret_name
    limit 1;

    if v_secret_id is null then
      v_secret_id := vault.create_secret(
        v_value,
        v_secret_name,
        format('Credencial %s do provedor %s', v_key, v_provider)
      );
    else
      perform vault.update_secret(
        v_secret_id,
        v_value,
        v_secret_name,
        format('Credencial %s do provedor %s', v_key, v_provider)
      );
    end if;

    v_secret_refs := jsonb_set(v_secret_refs, array[v_key], to_jsonb(v_secret_id::text), true);
  end loop;

  insert into public.payment_provider_settings (
    provider,
    enabled,
    environment,
    public_config,
    secret_refs,
    updated_by,
    updated_at
  )
  values (
    v_provider,
    coalesce(p_enabled, false),
    v_environment,
    coalesce(p_public_config, '{}'::jsonb),
    v_secret_refs,
    p_updated_by,
    now()
  )
  on conflict (provider) do update set
    enabled = excluded.enabled,
    environment = excluded.environment,
    public_config = excluded.public_config,
    secret_refs = excluded.secret_refs,
    updated_by = excluded.updated_by,
    updated_at = now();

  return jsonb_build_object('ok', true, 'provider', v_provider);
end;
$$;

create or replace function public.payment_provider_runtime(p_provider text)
returns jsonb
language plpgsql
security definer
set search_path = public, vault, pg_temp
as $$
declare
  v_settings public.payment_provider_settings%rowtype;
  v_secrets jsonb := '{}'::jsonb;
  v_key text;
  v_secret_id_text text;
  v_secret text;
begin
  select * into v_settings
  from public.payment_provider_settings
  where provider = lower(trim(coalesce(p_provider, '')));

  if not found then
    return null;
  end if;

  for v_key, v_secret_id_text in
    select key, value
    from jsonb_each_text(coalesce(v_settings.secret_refs, '{}'::jsonb))
  loop
    select decrypted_secret into v_secret
    from vault.decrypted_secrets
    where id = v_secret_id_text::uuid
    limit 1;

    if v_secret is not null then
      v_secrets := jsonb_set(v_secrets, array[v_key], to_jsonb(v_secret), true);
    end if;
  end loop;

  return jsonb_build_object(
    'provider', v_settings.provider,
    'enabled', v_settings.enabled,
    'environment', v_settings.environment,
    'public_config', v_settings.public_config,
    'secrets', v_secrets
  );
end;
$$;

create or replace function public.admin_payment_provider_status()
returns table (
  provider text,
  enabled boolean,
  environment text,
  public_config jsonb,
  configured_secrets text[],
  updated_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select
    s.provider,
    s.enabled,
    s.environment,
    s.public_config,
    coalesce(array(select jsonb_object_keys(s.secret_refs)), array[]::text[]),
    s.updated_at
  from public.payment_provider_settings s
  order by s.provider;
$$;

revoke all on function public.admin_set_payment_provider_config(text, boolean, text, jsonb, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.payment_provider_runtime(text) from public, anon, authenticated;
revoke all on function public.admin_payment_provider_status() from public, anon, authenticated;

grant execute on function public.admin_set_payment_provider_config(text, boolean, text, jsonb, jsonb, uuid) to service_role;
grant execute on function public.payment_provider_runtime(text) to service_role;
grant execute on function public.admin_payment_provider_status() to service_role;
