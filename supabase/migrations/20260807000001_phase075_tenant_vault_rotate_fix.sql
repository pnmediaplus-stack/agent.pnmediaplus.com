begin;

create or replace function public.phase074_rotate_tenant_integration(payload jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, tenant_integration_vault, pn_vault, portal_auth, pg_temp
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
  v_metadata_blob_id uuid;
  v_receipt_id uuid;
  v_receipt_ref text;
  v_provider_code text;
  v_integration_name text;

  -- pn_vault variables
  v_credential_ref text;
  v_credential_id uuid;
  v_master_key_id uuid;
  v_vault_blob_id uuid;
  
  v_raw_iv_b64 text;
  v_raw_ciphertext_b64 text;
  v_raw_auth_tag_b64 text;
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

  -- Fix 1: Check encrypted_payload BEFORE extracting fields from it
  if v_encrypted_payload is null or jsonb_typeof(v_encrypted_payload) <> 'object' then
    raise exception 'PHASE074_ENCRYPTED_SECRET_PAYLOAD_OBJECT_REQUIRED'
      using errcode = 'P0001';
  end if;

  v_raw_iv_b64 := tenant_integration_vault.phase074_required_text(v_encrypted_payload, 'raw_iv_b64');
  v_raw_ciphertext_b64 := tenant_integration_vault.phase074_required_text(v_encrypted_payload, 'raw_ciphertext_b64');
  v_raw_auth_tag_b64 := tenant_integration_vault.phase074_required_text(v_encrypted_payload, 'raw_auth_tag_b64');

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

  -- Fix 2: Handle missing vault_credential_ref (Backfill/Fallback)
  v_credential_ref := v_integration.vault_credential_ref;
  
  if v_credential_ref is null then
    -- We need provider_code to generate the credential ref
    select provider_code into v_provider_code 
    from tenant_integration_vault.integration_providers 
    where id = v_integration.provider_id;
    
    -- Gatekeeper Fix: Ensure provider_code is present
    if v_provider_code is null or btrim(v_provider_code) = '' then
      raise exception 'PHASE075_PROVIDER_CODE_REQUIRED'
        using errcode = 'P0001';
    end if;
    
    v_credential_ref := format('%s__%s__%s', replace(v_organization_id::text, '-', ''), v_provider_code, v_integration_key);
    
    -- Update the integration record with the new ref
    update tenant_integration_vault.tenant_integrations
    set vault_credential_ref = v_credential_ref
    where id = v_integration.id;
    
    v_integration.vault_credential_ref := v_credential_ref;
  end if;

  -- 1. Find the pn_vault credential ID based on vault_credential_ref
  select id into v_credential_id
  from pn_vault.vault_credentials
  where credential_ref = v_integration.vault_credential_ref;

  if not found then
    -- Create the missing pn_vault.vault_credentials record
    select provider_code into v_provider_code 
    from tenant_integration_vault.integration_providers 
    where id = v_integration.provider_id;
    
    -- Gatekeeper Fix: Ensure provider_code is present here too
    if v_provider_code is null or btrim(v_provider_code) = '' then
      raise exception 'PHASE075_PROVIDER_CODE_REQUIRED'
        using errcode = 'P0001';
    end if;
    
    insert into pn_vault.vault_credentials (
      credential_ref,
      owner_ref,
      provider_code,
      credential_name,
      created_by_actor_type,
      created_by_actor_ref
    ) values (
      v_integration.vault_credential_ref,
      v_organization_id::text,
      v_provider_code,
      v_integration.integration_name,
      v_actor_type::pn_vault.vault_actor_type,
      v_actor_ref
    ) returning id into v_credential_id;
  end if;

  -- 2. Get Master Key
  select id into v_master_key_id from pn_vault.vault_master_keys where active = true order by activated_at desc limit 1;
  if not found then
    insert into pn_vault.vault_master_keys (key_ref, key_version, key_fingerprint, provider_code)
    values ('local_dev_key', 1, repeat('0', 64), 'server_side_kms')
    returning id into v_master_key_id;
  end if;

  -- 3. Calculate new secret revision
  select coalesce(max(secret_revision), 0) + 1
  into v_secret_revision
  from tenant_integration_vault.integration_secret_blobs
  where tenant_integration_id = v_integration.id;

  -- 4. Insert actual secret into pn_vault.vault_secret_blobs
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
    v_secret_revision,
    v_master_key_id,
    decode(v_raw_ciphertext_b64, 'base64') || decode(v_raw_auth_tag_b64, 'base64'),
    decode(v_raw_iv_b64, 'base64'),
    v_ciphertext_sha256,
    v_actor_type::pn_vault.vault_actor_type,
    v_actor_ref
  ) returning id into v_vault_blob_id;

  -- 5. Update pn_vault.vault_credentials current_secret_blob_id and current_master_key_id
  update pn_vault.vault_credentials 
  set current_secret_blob_id = v_vault_blob_id,
      current_master_key_id = v_master_key_id
  where id = v_credential_id;

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
    v_integration.id,
    v_secret_revision,
    v_encryption_contract_ref,
    v_key_ref,
    v_key_version,
    v_encryption_algorithm,
    jsonb_build_object('ref', 'pn_vault.vault_secret_blobs', 'credential_ref', v_integration.vault_credential_ref),
    v_ciphertext_sha256,
    v_actor_type,
    v_actor_ref
  )
  returning id into v_metadata_blob_id;

  -- 7. Update tenant integration current_secret_blob_id
  update tenant_integration_vault.tenant_integrations
  set current_secret_blob_id = v_metadata_blob_id,
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
    v_metadata_blob_id,
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

commit;
