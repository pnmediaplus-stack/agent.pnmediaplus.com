begin;

-- Add vault_credential_ref to tenant_integrations
alter table tenant_integration_vault.tenant_integrations
  add column if not exists vault_credential_ref text unique;

-- Re-create append_audit to include request_id
create or replace function tenant_integration_vault.phase075_append_audit(
  p_organization_id uuid,
  p_tenant_integration_id uuid,
  p_secret_blob_id uuid,
  p_receipt_id uuid,
  p_actor_type text,
  p_actor_ref text,
  p_action text,
  p_result text,
  p_reason text,
  p_request_id uuid
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
    request_id,
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
    p_request_id,
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

-- Overwrite create RPC to enforce mapping and strict storage split
create or replace function public.phase074_create_tenant_integration(payload jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, tenant_integration_vault, pn_vault, portal_auth, pg_temp
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
  v_request_id uuid;
  v_provider tenant_integration_vault.integration_providers%rowtype;
  v_integration_id uuid;
  v_metadata_blob_id uuid;
  v_receipt_id uuid;
  v_receipt_ref text;
  
  -- pn_vault variables
  v_credential_ref text;
  v_credential_id uuid;
  v_master_key_id uuid;
  v_vault_blob_id uuid;
  v_secret_revision integer;
  
  v_raw_iv_b64 text;
  v_raw_ciphertext_b64 text;
  v_raw_auth_tag_b64 text;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'PHASE074_PAYLOAD_OBJECT_REQUIRED' using errcode = 'P0001';
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
  v_request_id := tenant_integration_vault.phase074_required_text(payload, 'request_id')::uuid;
  
  v_encrypted_payload := payload -> 'encrypted_secret_payload';

  v_raw_iv_b64 := tenant_integration_vault.phase074_required_text(v_encrypted_payload, 'raw_iv_b64');
  v_raw_ciphertext_b64 := tenant_integration_vault.phase074_required_text(v_encrypted_payload, 'raw_ciphertext_b64');
  v_raw_auth_tag_b64 := tenant_integration_vault.phase074_required_text(v_encrypted_payload, 'raw_auth_tag_b64');

  select * into v_provider
  from tenant_integration_vault.integration_providers
  where provider_code = v_provider_code and status = 'active';

  if not found then
    raise exception 'PHASE074_PROVIDER_ACTIVE_REQUIRED' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from tenant_integration_vault.tenant_integrations i
    where i.organization_id = v_organization_id and i.integration_key = v_integration_key
  ) then
    raise exception 'PHASE074_TENANT_INTEGRATION_ALREADY_EXISTS' using errcode = 'P0001';
  end if;

  -- 1. Deterministic Vault Mapping
  v_credential_ref := format('%s__%s__%s', replace(v_organization_id::text, '-', ''), v_provider_code, v_integration_key);

  -- 2. Create Tenant Integration (Business Key)
  insert into tenant_integration_vault.tenant_integrations (
    organization_id,
    provider_id,
    integration_key,
    integration_name,
    status,
    connection_state,
    public_metadata,
    vault_credential_ref
  )
  values (
    v_organization_id,
    v_provider.id,
    v_integration_key,
    v_integration_name,
    'configured',
    'unverified',
    jsonb_build_object('phase', '075', 'redaction_status', 'NO_SECRET_MATERIAL_RETURNED'),
    v_credential_ref
  )
  returning id into v_integration_id;

  -- 3. Get Master Key
  select id into v_master_key_id from pn_vault.vault_master_keys where active = true order by activated_at desc limit 1;
  if not found then
    insert into pn_vault.vault_master_keys (key_ref, key_version, key_fingerprint, provider_code)
    values ('local_dev_key', 1, repeat('0', 64), 'server_side_kms')
    returning id into v_master_key_id;
  end if;

  -- 4. Create pn_vault Credential
  insert into pn_vault.vault_credentials (
    credential_ref,
    owner_ref,
    provider_code,
    credential_name,
    created_by_actor_type,
    created_by_actor_ref
  ) values (
    v_credential_ref,
    v_organization_id::text,
    v_provider_code,
    v_integration_name,
    v_actor_type::pn_vault.vault_actor_type,
    v_actor_ref
  ) returning id into v_credential_id;

  -- 5. Insert actual secret into pn_vault.vault_secret_blobs
  insert into pn_vault.vault_secret_blobs (
    credential_id,
    secret_revision,
    master_key_id,
    ciphertext,
    ciphertext_nonce,
    content_sha256,
    created_by_actor_type,
    created_by_actor_ref
  ) values (
    v_credential_id,
    1,
    v_master_key_id,
    decode(v_raw_ciphertext_b64, 'base64'),
    decode(v_raw_iv_b64, 'base64'),
    v_ciphertext_sha256,
    v_actor_type::pn_vault.vault_actor_type,
    v_actor_ref
  ) returning id into v_vault_blob_id;

  update pn_vault.vault_credentials set current_secret_blob_id = v_vault_blob_id where id = v_credential_id;

  -- 6. Insert metadata ONLY into integration_secret_blobs
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
    jsonb_build_object('ref', 'pn_vault.vault_secret_blobs', 'credential_ref', v_credential_ref),
    v_ciphertext_sha256,
    v_actor_type,
    v_actor_ref
  )
  returning id into v_metadata_blob_id;

  update tenant_integration_vault.tenant_integrations
  set current_secret_blob_id = v_metadata_blob_id
  where id = v_integration_id;

  v_receipt_ref := format('phase075:create:%s:%s', v_integration_key, replace(gen_random_uuid()::text, '-', ''));

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
    v_metadata_blob_id,
    v_receipt_ref,
    'issued',
    v_actor_type,
    v_actor_ref,
    jsonb_build_object('operation', 'create', 'redaction_status', 'NO_SECRET_MATERIAL_RETURNED')
  )
  returning id into v_receipt_id;

  perform tenant_integration_vault.phase075_append_audit(v_organization_id, v_integration_id, null, null, v_actor_type, v_actor_ref, 'INTEGRATION_CREATED', 'PASS', 'PHASE075_CREATE_RPC', v_request_id);
  perform tenant_integration_vault.phase075_append_audit(v_organization_id, v_integration_id, v_metadata_blob_id, v_receipt_id, v_actor_type, v_actor_ref, 'SECRET_STORED', 'PASS', 'PHASE075_CREATE_RPC', v_request_id);

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

commit;

create or replace function public.phase075_reset_tenant_integration_state(payload jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, tenant_integration_vault, pg_temp
as $$
declare
  v_organization_id uuid;
  v_integration_key text;
  v_status text;
  v_connection_state text;
  v_public_metadata jsonb;
  v_last_verified_at timestamptz;
  v_updated integer;
begin
  if payload is null or jsonb_typeof(payload) <> 'object' then
    raise exception 'PHASE075_PAYLOAD_OBJECT_REQUIRED'
      using errcode = 'P0001';
  end if;

  v_organization_id := (payload ->> 'organization_id')::uuid;
  v_integration_key := payload ->> 'integration_key';
  v_status := coalesce(payload ->> 'status', 'configured');
  v_connection_state := coalesce(payload ->> 'connection_state', 'unverified');
  v_public_metadata := payload -> 'public_metadata';
  v_last_verified_at := nullif(payload ->> 'last_verified_at', '')::timestamptz;

  update tenant_integration_vault.tenant_integrations
  set status = v_status,
      connection_state = v_connection_state,
      last_verified_at = coalesce(v_last_verified_at, last_verified_at),
      public_metadata = coalesce(v_public_metadata, public_metadata),
      disabled_at = null
  where organization_id = v_organization_id
    and integration_key = v_integration_key;

  get diagnostics v_updated = row_count;

  if v_updated <> 1 then
    raise exception 'PHASE075_RESET_FAILED: expected exactly 1 row updated, got %', v_updated
      using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'ok', true,
    'organization_id', v_organization_id,
    'integration_key', v_integration_key,
    'status', v_status,
    'connection_state', v_connection_state,
    'last_verified_at', v_last_verified_at
  );
end;
$$;

do $$
begin
  revoke all on function public.phase075_reset_tenant_integration_state(jsonb) from public;

  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on function public.phase075_reset_tenant_integration_state(jsonb) from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on function public.phase075_reset_tenant_integration_state(jsonb) from authenticated;
  end if;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.phase075_reset_tenant_integration_state(jsonb) to service_role;
  end if;
end $$;
