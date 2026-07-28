begin;

create extension if not exists pgcrypto;

create or replace function tenant_integration_vault.payload_contains_raw_secret_material(p_value jsonb)
returns boolean
language plpgsql
stable
security definer
set search_path = tenant_integration_vault, pg_temp
as $$
declare
  v_key text;
  v_value jsonb;
begin
  if p_value is null then
    return false;
  end if;

  if jsonb_typeof(p_value) = 'array' then
    for v_value in select value from jsonb_array_elements(p_value)
    loop
      if tenant_integration_vault.payload_contains_raw_secret_material(v_value) then
        return true;
      end if;
    end loop;
  elsif jsonb_typeof(p_value) = 'object' then
    for v_key, v_value in select key, value from jsonb_each(p_value)
    loop
      if lower(v_key) in (
        'raw_secret',
        'secret_material',
        'plaintext',
        'plain_text',
        'password',
        'api_key',
        'client_secret',
        'access_token',
        'refresh_token',
        'bearer_token',
        'private_key'
      ) then
        return true;
      end if;

      if tenant_integration_vault.payload_contains_raw_secret_material(v_value) then
        return true;
      end if;
    end loop;
  end if;

  return false;
end;
$$;

create or replace function tenant_integration_vault.phase074_required_text(p_payload jsonb, p_key text)
returns text
language plpgsql
stable
security definer
set search_path = tenant_integration_vault, pg_temp
as $$
declare
  v_value text;
begin
  v_value := nullif(btrim(p_payload ->> p_key), '');

  if v_value is null then
    raise exception 'PHASE074_REQUIRED_FIELD_MISSING:%', p_key
      using errcode = 'P0001';
  end if;

  return v_value;
end;
$$;

create or replace function tenant_integration_vault.phase074_event_hash(
  p_organization_id uuid,
  p_tenant_integration_id uuid,
  p_secret_blob_id uuid,
  p_receipt_id uuid,
  p_actor_type text,
  p_actor_ref text,
  p_action text,
  p_result text,
  p_reason text
)
returns char(64)
language sql
volatile
security definer
set search_path = tenant_integration_vault, pg_temp
as $$
  select (
    md5(concat_ws(
    ':',
    coalesce(p_organization_id::text, ''),
    coalesce(p_tenant_integration_id::text, ''),
    coalesce(p_secret_blob_id::text, ''),
    coalesce(p_receipt_id::text, ''),
    p_actor_type,
    p_actor_ref,
    p_action,
    p_result,
    coalesce(p_reason, ''),
    clock_timestamp()::text,
    gen_random_uuid()::text
    ))
    ||
    md5(concat_ws(
      ':',
      coalesce(p_organization_id::text, ''),
      coalesce(p_tenant_integration_id::text, ''),
      coalesce(p_secret_blob_id::text, ''),
      coalesce(p_receipt_id::text, ''),
      p_actor_type,
      p_actor_ref,
      p_action,
      p_result,
      coalesce(p_reason, ''),
      clock_timestamp()::text,
      gen_random_uuid()::text
    ))
  )::char(64);
$$;

create or replace function tenant_integration_vault.phase074_append_audit(
  p_organization_id uuid,
  p_tenant_integration_id uuid,
  p_secret_blob_id uuid,
  p_receipt_id uuid,
  p_actor_type text,
  p_actor_ref text,
  p_action text,
  p_result text,
  p_reason text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = tenant_integration_vault, pg_temp
as $$
begin
  insert into tenant_integration_vault.integration_access_audit (
    organization_id,
    tenant_integration_id,
    secret_blob_id,
    receipt_id,
    actor_type,
    actor_ref,
    action,
    result,
    reason,
    event_hash
  )
  values (
    p_organization_id,
    p_tenant_integration_id,
    p_secret_blob_id,
    p_receipt_id,
    p_actor_type,
    p_actor_ref,
    p_action,
    p_result,
    p_reason,
    tenant_integration_vault.phase074_event_hash(
      p_organization_id,
      p_tenant_integration_id,
      p_secret_blob_id,
      p_receipt_id,
      p_actor_type,
      p_actor_ref,
      p_action,
      p_result,
      p_reason
    )
  );
end;
$$;

create or replace function public.phase074_create_tenant_integration(payload jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, tenant_integration_vault, portal_auth, pg_temp
as $$
declare
  v_organization_id uuid;
  v_provider_code text;
  v_integration_key text;
  v_integration_name text;
  v_encryption_contract_ref text;
  v_encryption_algorithm text;
  v_key_ref text;
  v_key_version integer;
  v_encrypted_payload jsonb;
  v_ciphertext_sha256 text;
  v_actor_type text;
  v_actor_ref text;
  v_provider tenant_integration_vault.integration_providers%rowtype;
  v_integration_id uuid;
  v_secret_blob_id uuid;
  v_receipt_id uuid;
  v_receipt_ref text;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'PHASE074_PAYLOAD_OBJECT_REQUIRED'
      using errcode = 'P0001';
  end if;

  if tenant_integration_vault.payload_contains_raw_secret_material(payload) then
    raise exception 'PHASE074_RAW_SECRET_MATERIAL_FORBIDDEN'
      using errcode = 'P0001';
  end if;

  v_organization_id := tenant_integration_vault.phase074_required_text(payload, 'organization_id')::uuid;
  v_provider_code := tenant_integration_vault.phase074_required_text(payload, 'provider_code');
  v_integration_key := tenant_integration_vault.phase074_required_text(payload, 'integration_key');
  v_integration_name := tenant_integration_vault.phase074_required_text(payload, 'integration_name');
  v_encryption_contract_ref := tenant_integration_vault.phase074_required_text(payload, 'encryption_contract_ref');
  v_encryption_algorithm := tenant_integration_vault.phase074_required_text(payload, 'encryption_algorithm');
  v_key_ref := tenant_integration_vault.phase074_required_text(payload, 'key_ref');
  v_key_version := tenant_integration_vault.phase074_required_text(payload, 'key_version')::integer;
  v_ciphertext_sha256 := lower(tenant_integration_vault.phase074_required_text(payload, 'ciphertext_sha256'));
  v_actor_type := tenant_integration_vault.phase074_required_text(payload, 'actor_type');
  v_actor_ref := tenant_integration_vault.phase074_required_text(payload, 'actor_ref');
  v_encrypted_payload := payload -> 'encrypted_secret_payload';

  if v_encrypted_payload is null or jsonb_typeof(v_encrypted_payload) <> 'object' then
    raise exception 'PHASE074_ENCRYPTED_SECRET_PAYLOAD_OBJECT_REQUIRED'
      using errcode = 'P0001';
  end if;

  if v_key_version <= 0 then
    raise exception 'PHASE074_KEY_VERSION_INVALID'
      using errcode = 'P0001';
  end if;

  select *
  into v_provider
  from tenant_integration_vault.integration_providers
  where provider_code = v_provider_code
    and status = 'active';

  if not found then
    raise exception 'PHASE074_PROVIDER_ACTIVE_REQUIRED'
      using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from portal_auth.organizations o
    where o.id = v_organization_id
      and o.status = 'active'
  ) then
    raise exception 'PHASE074_ORGANIZATION_ACTIVE_REQUIRED'
      using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from tenant_integration_vault.tenant_integrations i
    where i.organization_id = v_organization_id
      and i.integration_key = v_integration_key
  ) then
    raise exception 'PHASE074_TENANT_INTEGRATION_ALREADY_EXISTS'
      using errcode = 'P0001';
  end if;

  insert into tenant_integration_vault.tenant_integrations (
    organization_id,
    provider_id,
    integration_key,
    integration_name,
    status,
    connection_state,
    public_metadata
  )
  values (
    v_organization_id,
    v_provider.id,
    v_integration_key,
    v_integration_name,
    'configured',
    'unverified',
    jsonb_build_object(
      'phase', '074',
      'redaction_status', 'NO_SECRET_MATERIAL_RETURNED'
    )
  )
  returning id into v_integration_id;

  insert into tenant_integration_vault.integration_secret_blobs (
    tenant_integration_id,
    secret_revision,
    encryption_contract_ref,
    key_ref,
    key_version,
    encryption_algorithm,
    encrypted_secret_payload,
    ciphertext_sha256,
    created_by_actor_type,
    created_by_actor_ref
  )
  values (
    v_integration_id,
    1,
    v_encryption_contract_ref,
    v_key_ref,
    v_key_version,
    v_encryption_algorithm,
    v_encrypted_payload,
    v_ciphertext_sha256,
    v_actor_type,
    v_actor_ref
  )
  returning id into v_secret_blob_id;

  update tenant_integration_vault.tenant_integrations
  set current_secret_blob_id = v_secret_blob_id,
      status = 'configured',
      connection_state = 'unverified'
  where id = v_integration_id;

  v_receipt_ref := format('phase074:create:%s:%s', v_integration_key, replace(gen_random_uuid()::text, '-', ''));

  insert into tenant_integration_vault.integration_secret_receipts (
    tenant_integration_id,
    secret_blob_id,
    receipt_ref,
    receipt_state,
    issued_by_actor_type,
    issued_by_actor_ref,
    metadata
  )
  values (
    v_integration_id,
    v_secret_blob_id,
    v_receipt_ref,
    'issued',
    v_actor_type,
    v_actor_ref,
    jsonb_build_object(
      'operation', 'create',
      'redaction_status', 'NO_SECRET_MATERIAL_RETURNED'
    )
  )
  returning id into v_receipt_id;

  perform tenant_integration_vault.phase074_append_audit(v_organization_id, v_integration_id, null, null, v_actor_type, v_actor_ref, 'INTEGRATION_CREATED', 'PASS', 'PHASE074_CREATE_RPC');
  perform tenant_integration_vault.phase074_append_audit(v_organization_id, v_integration_id, v_secret_blob_id, v_receipt_id, v_actor_type, v_actor_ref, 'SECRET_STORED', 'PASS', 'PHASE074_CREATE_RPC');
  perform tenant_integration_vault.phase074_append_audit(v_organization_id, v_integration_id, v_secret_blob_id, v_receipt_id, v_actor_type, v_actor_ref, 'SECRET_RECEIPT_ISSUED', 'PASS', 'PHASE074_CREATE_RPC');

  return jsonb_build_object(
    'receipt_ref', v_receipt_ref,
    'receipt_state', 'issued',
    'operation', 'create',
    'integration_key', v_integration_key,
    'status', 'configured',
    'connection_state', 'unverified',
    'redaction_status', 'NO_SECRET_MATERIAL_RETURNED'
  );
end;
$$;

create or replace function public.phase074_rotate_tenant_integration(payload jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, tenant_integration_vault, portal_auth, pg_temp
as $$
declare
  v_organization_id uuid;
  v_integration_key text;
  v_encryption_contract_ref text;
  v_encryption_algorithm text;
  v_key_ref text;
  v_key_version integer;
  v_encrypted_payload jsonb;
  v_ciphertext_sha256 text;
  v_actor_type text;
  v_actor_ref text;
  v_integration tenant_integration_vault.tenant_integrations%rowtype;
  v_secret_revision integer;
  v_secret_blob_id uuid;
  v_receipt_id uuid;
  v_receipt_ref text;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'PHASE074_PAYLOAD_OBJECT_REQUIRED'
      using errcode = 'P0001';
  end if;

  if tenant_integration_vault.payload_contains_raw_secret_material(payload) then
    raise exception 'PHASE074_RAW_SECRET_MATERIAL_FORBIDDEN'
      using errcode = 'P0001';
  end if;

  v_organization_id := tenant_integration_vault.phase074_required_text(payload, 'organization_id')::uuid;
  v_integration_key := tenant_integration_vault.phase074_required_text(payload, 'integration_key');
  v_encryption_contract_ref := tenant_integration_vault.phase074_required_text(payload, 'encryption_contract_ref');
  v_encryption_algorithm := tenant_integration_vault.phase074_required_text(payload, 'encryption_algorithm');
  v_key_ref := tenant_integration_vault.phase074_required_text(payload, 'key_ref');
  v_key_version := tenant_integration_vault.phase074_required_text(payload, 'key_version')::integer;
  v_ciphertext_sha256 := lower(tenant_integration_vault.phase074_required_text(payload, 'ciphertext_sha256'));
  v_actor_type := tenant_integration_vault.phase074_required_text(payload, 'actor_type');
  v_actor_ref := tenant_integration_vault.phase074_required_text(payload, 'actor_ref');
  v_encrypted_payload := payload -> 'encrypted_secret_payload';

  if v_encrypted_payload is null or jsonb_typeof(v_encrypted_payload) <> 'object' then
    raise exception 'PHASE074_ENCRYPTED_SECRET_PAYLOAD_OBJECT_REQUIRED'
      using errcode = 'P0001';
  end if;

  if v_key_version <= 0 then
    raise exception 'PHASE074_KEY_VERSION_INVALID'
      using errcode = 'P0001';
  end if;

  select *
  into v_integration
  from tenant_integration_vault.tenant_integrations
  where organization_id = v_organization_id
    and integration_key = v_integration_key;

  if not found then
    raise exception 'PHASE074_TENANT_INTEGRATION_NOT_FOUND'
      using errcode = 'P0001';
  end if;

  if v_integration.status in ('disabled', 'revoked') then
    raise exception 'PHASE074_TENANT_INTEGRATION_NOT_ROTATABLE'
      using errcode = 'P0001';
  end if;

  select coalesce(max(secret_revision), 0) + 1
  into v_secret_revision
  from tenant_integration_vault.integration_secret_blobs
  where tenant_integration_id = v_integration.id;

  insert into tenant_integration_vault.integration_secret_blobs (
    tenant_integration_id,
    secret_revision,
    encryption_contract_ref,
    key_ref,
    key_version,
    encryption_algorithm,
    encrypted_secret_payload,
    ciphertext_sha256,
    created_by_actor_type,
    created_by_actor_ref
  )
  values (
    v_integration.id,
    v_secret_revision,
    v_encryption_contract_ref,
    v_key_ref,
    v_key_version,
    v_encryption_algorithm,
    v_encrypted_payload,
    v_ciphertext_sha256,
    v_actor_type,
    v_actor_ref
  )
  returning id into v_secret_blob_id;

  update tenant_integration_vault.tenant_integrations
  set current_secret_blob_id = v_secret_blob_id,
      status = 'configured',
      connection_state = 'unverified',
      disabled_at = null
  where id = v_integration.id;

  v_receipt_ref := format('phase074:rotate:%s:%s', v_integration_key, replace(gen_random_uuid()::text, '-', ''));

  insert into tenant_integration_vault.integration_secret_receipts (
    tenant_integration_id,
    secret_blob_id,
    receipt_ref,
    receipt_state,
    issued_by_actor_type,
    issued_by_actor_ref,
    metadata
  )
  values (
    v_integration.id,
    v_secret_blob_id,
    v_receipt_ref,
    'issued',
    v_actor_type,
    v_actor_ref,
    jsonb_build_object(
      'operation', 'rotate',
      'redaction_status', 'NO_SECRET_MATERIAL_RETURNED'
    )
  )
  returning id into v_receipt_id;

  perform tenant_integration_vault.phase074_append_audit(v_organization_id, v_integration.id, v_secret_blob_id, v_receipt_id, v_actor_type, v_actor_ref, 'SECRET_STORED', 'PASS', 'PHASE074_ROTATE_RPC');
  perform tenant_integration_vault.phase074_append_audit(v_organization_id, v_integration.id, v_secret_blob_id, v_receipt_id, v_actor_type, v_actor_ref, 'SECRET_RECEIPT_ISSUED', 'PASS', 'PHASE074_ROTATE_RPC');

  return jsonb_build_object(
    'receipt_ref', v_receipt_ref,
    'receipt_state', 'issued',
    'operation', 'rotate',
    'integration_key', v_integration_key,
    'status', 'configured',
    'connection_state', 'unverified',
    'redaction_status', 'NO_SECRET_MATERIAL_RETURNED'
  );
end;
$$;

create or replace function public.phase074_revoke_tenant_integration(payload jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, tenant_integration_vault, portal_auth, pg_temp
as $$
declare
  v_organization_id uuid;
  v_integration_key text;
  v_actor_type text;
  v_actor_ref text;
  v_integration tenant_integration_vault.tenant_integrations%rowtype;
  v_receipt_id uuid;
  v_receipt_ref text;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'PHASE074_PAYLOAD_OBJECT_REQUIRED'
      using errcode = 'P0001';
  end if;

  if tenant_integration_vault.payload_contains_raw_secret_material(payload) then
    raise exception 'PHASE074_RAW_SECRET_MATERIAL_FORBIDDEN'
      using errcode = 'P0001';
  end if;

  v_organization_id := tenant_integration_vault.phase074_required_text(payload, 'organization_id')::uuid;
  v_integration_key := tenant_integration_vault.phase074_required_text(payload, 'integration_key');
  v_actor_type := tenant_integration_vault.phase074_required_text(payload, 'actor_type');
  v_actor_ref := tenant_integration_vault.phase074_required_text(payload, 'actor_ref');

  select *
  into v_integration
  from tenant_integration_vault.tenant_integrations
  where organization_id = v_organization_id
    and integration_key = v_integration_key;

  if not found then
    raise exception 'PHASE074_TENANT_INTEGRATION_NOT_FOUND'
      using errcode = 'P0001';
  end if;

  if v_integration.current_secret_blob_id is null then
    raise exception 'PHASE074_CURRENT_SECRET_BLOB_REQUIRED'
      using errcode = 'P0001';
  end if;

  update tenant_integration_vault.tenant_integrations
  set status = 'revoked',
      connection_state = 'blocked',
      disabled_at = coalesce(disabled_at, now())
  where id = v_integration.id;

  v_receipt_ref := format('phase074:revoke:%s:%s', v_integration_key, replace(gen_random_uuid()::text, '-', ''));

  insert into tenant_integration_vault.integration_secret_receipts (
    tenant_integration_id,
    secret_blob_id,
    receipt_ref,
    receipt_state,
    issued_by_actor_type,
    issued_by_actor_ref,
    revoked_at,
    metadata
  )
  values (
    v_integration.id,
    v_integration.current_secret_blob_id,
    v_receipt_ref,
    'revoked',
    v_actor_type,
    v_actor_ref,
    now(),
    jsonb_build_object(
      'operation', 'revoke',
      'redaction_status', 'NO_SECRET_MATERIAL_RETURNED'
    )
  )
  returning id into v_receipt_id;

  perform tenant_integration_vault.phase074_append_audit(v_organization_id, v_integration.id, v_integration.current_secret_blob_id, v_receipt_id, v_actor_type, v_actor_ref, 'INTEGRATION_STATUS_CHANGED', 'PASS', 'PHASE074_REVOKE_RPC');
  perform tenant_integration_vault.phase074_append_audit(v_organization_id, v_integration.id, v_integration.current_secret_blob_id, v_receipt_id, v_actor_type, v_actor_ref, 'SECRET_RECEIPT_ISSUED', 'PASS', 'PHASE074_REVOKE_RPC');

  return jsonb_build_object(
    'receipt_ref', v_receipt_ref,
    'receipt_state', 'revoked',
    'operation', 'revoke',
    'integration_key', v_integration_key,
    'status', 'revoked',
    'connection_state', 'blocked',
    'redaction_status', 'NO_SECRET_MATERIAL_RETURNED'
  );
end;
$$;

do $$
begin
  revoke all on function public.phase074_create_tenant_integration(jsonb) from public;
  revoke all on function public.phase074_rotate_tenant_integration(jsonb) from public;
  revoke all on function public.phase074_revoke_tenant_integration(jsonb) from public;

  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.phase074_create_tenant_integration(jsonb) from anon;
    revoke all on function public.phase074_rotate_tenant_integration(jsonb) from anon;
    revoke all on function public.phase074_revoke_tenant_integration(jsonb) from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function public.phase074_create_tenant_integration(jsonb) from authenticated;
    revoke all on function public.phase074_rotate_tenant_integration(jsonb) from authenticated;
    revoke all on function public.phase074_revoke_tenant_integration(jsonb) from authenticated;
  end if;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.phase074_create_tenant_integration(jsonb) to service_role;
    grant execute on function public.phase074_rotate_tenant_integration(jsonb) to service_role;
    grant execute on function public.phase074_revoke_tenant_integration(jsonb) to service_role;
  end if;
end $$;

commit;
