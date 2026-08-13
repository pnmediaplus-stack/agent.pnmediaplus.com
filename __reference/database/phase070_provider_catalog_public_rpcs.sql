begin;

create or replace function public.phase070_upsert_integration_provider(payload jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, tenant_integration_vault, pg_temp
as $$
declare
  v_provider_code text;
  v_provider_name text;
  v_provider_category text;
  v_auth_type text;
  v_public_metadata jsonb;
  v_provider_id uuid;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'PHASE070_PROVIDER_PAYLOAD_OBJECT_REQUIRED'
      using errcode = 'P0001';
  end if;

  v_provider_code := nullif(btrim(payload ->> 'provider_code'), '');
  v_provider_name := nullif(btrim(payload ->> 'provider_name'), '');
  v_provider_category := coalesce(nullif(btrim(payload ->> 'provider_category'), ''), 'ai');
  v_auth_type := nullif(btrim(payload ->> 'auth_type'), '');
  v_public_metadata := coalesce(payload -> 'public_metadata', '{}'::jsonb);

  if v_provider_code is null then
    raise exception 'PHASE070_PROVIDER_CODE_REQUIRED'
      using errcode = 'P0001';
  end if;

  if v_provider_name is null then
    raise exception 'PHASE070_PROVIDER_NAME_REQUIRED'
      using errcode = 'P0001';
  end if;

  if v_auth_type is null then
    raise exception 'PHASE070_PROVIDER_AUTH_TYPE_REQUIRED'
      using errcode = 'P0001';
  end if;

  if jsonb_typeof(v_public_metadata) <> 'object' then
    raise exception 'PHASE070_PROVIDER_PUBLIC_METADATA_OBJECT_REQUIRED'
      using errcode = 'P0001';
  end if;

  insert into tenant_integration_vault.integration_providers (
    provider_code,
    provider_name,
    provider_category,
    auth_type,
    status,
    capabilities,
    public_metadata
  )
  values (
    v_provider_code,
    v_provider_name,
    v_provider_category,
    v_auth_type,
    'active',
    coalesce(v_public_metadata -> 'capabilities', '[]'::jsonb),
    v_public_metadata
  )
  on conflict (provider_code) do update
    set provider_name = excluded.provider_name,
        provider_category = excluded.provider_category,
        auth_type = excluded.auth_type,
        status = 'active',
        capabilities = excluded.capabilities,
        public_metadata = excluded.public_metadata
  returning id into v_provider_id;

  return jsonb_build_object(
    'ok', true,
    'provider_id', v_provider_id,
    'provider_code', v_provider_code,
    'status', 'active',
    'reason', 'PHASE070_PROVIDER_CATALOG_UPSERTED'
  );
end;
$$;

create or replace function public.phase070_delete_integration_provider(payload jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, tenant_integration_vault, pg_temp
as $$
declare
  v_provider_code text;
  v_provider_id uuid;
  v_updated integer;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'PHASE070_PROVIDER_PAYLOAD_OBJECT_REQUIRED'
      using errcode = 'P0001';
  end if;

  v_provider_code := nullif(btrim(payload ->> 'provider_code'), '');

  if v_provider_code is null then
    raise exception 'PHASE070_PROVIDER_CODE_REQUIRED'
      using errcode = 'P0001';
  end if;

  update tenant_integration_vault.integration_providers
  set status = 'disabled'
  where provider_code = v_provider_code
  returning id into v_provider_id;

  get diagnostics v_updated = row_count;

  if v_updated <> 1 then
    raise exception 'PHASE070_PROVIDER_NOT_FOUND:%', v_provider_code
      using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'ok', true,
    'provider_id', v_provider_id,
    'provider_code', v_provider_code,
    'status', 'disabled',
    'reason', 'PHASE070_PROVIDER_CATALOG_DISABLED'
  );
end;
$$;

do $$
begin
  revoke all on function public.phase070_upsert_integration_provider(jsonb) from public;
  revoke all on function public.phase070_delete_integration_provider(jsonb) from public;

  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.phase070_upsert_integration_provider(jsonb) from anon;
    revoke all on function public.phase070_delete_integration_provider(jsonb) from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function public.phase070_upsert_integration_provider(jsonb) from authenticated;
    revoke all on function public.phase070_delete_integration_provider(jsonb) from authenticated;
  end if;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.phase070_upsert_integration_provider(jsonb) to service_role;
    grant execute on function public.phase070_delete_integration_provider(jsonb) to service_role;
  end if;
end $$;

commit;
