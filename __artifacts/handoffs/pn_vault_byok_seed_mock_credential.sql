-- PN Vault BYOK mock credential seed
-- Generated for localhost E2E only. Does not contain plaintext API key.
-- Credential ref: byok_live_e2e_smoke

begin;

with master_key as (
  insert into pn_vault.vault_master_keys (
    key_ref,
    key_version,
    key_fingerprint,
    provider_code,
    active,
    activated_at,
    rotation_reason
  ) values (
    'byok_master',
    1,
    '5299b89aac043f17b8328f5c9f8ae84ec88e843961a631d7f47d07aeae6ddfab',
    'server_side_kms',
    true,
    now(),
    'BYOK localhost E2E mock seed'
  )
  on conflict (key_ref) do update
    set active = excluded.active,
        updated_at = now()
  returning id
), credential as (
  insert into pn_vault.vault_credentials (
    credential_ref,
    owner_ref,
    provider_code,
    credential_name,
    secret_kind,
    state,
    current_master_key_id,
    notes,
    created_by_actor_type,
    created_by_actor_ref
  )
  select
    'byok_live_e2e_smoke',
    'human:byok-e2e-seed',
    'openai',
    'BYOK Live E2E Smoke Credential',
    'LLM_KEY',
    'ACTIVE',
    master_key.id,
    'Mock credential for localhost BYOK broker E2E only.',
    'HUMAN',
    'human:byok-e2e-seed'
  from master_key
  on conflict (credential_ref) do update
    set state = 'ACTIVE',
        current_master_key_id = excluded.current_master_key_id,
        updated_at = now()
  returning id, current_master_key_id
), secret_blob as (
  insert into pn_vault.vault_secret_blobs (
    credential_id,
    secret_revision,
    master_key_id,
    ciphertext,
    ciphertext_nonce,
    cipher_suite,
    content_sha256,
    created_by_actor_type,
    created_by_actor_ref
  )
  select
    credential.id,
    coalesce((
      select max(secret_revision) + 1
      from pn_vault.vault_secret_blobs existing
      where existing.credential_id = credential.id
    ), 1),
    credential.current_master_key_id,
    convert_to('v1:wN5wbTR7NyS+cVBC:gSJAIN6wtJep9L6+sLH4B42o90dKvQ==:uQxsLSrBSvQozLkCaJGnLg==', 'UTF8'),
    convert_to('embedded_in_cipher_package', 'UTF8'),
    'aes-256-gcm:version_iv_ciphertext_tag',
    null,
    'HUMAN',
    'human:byok-e2e-seed'
  from credential
  returning id, credential_id
)
update pn_vault.vault_credentials credential
set current_secret_blob_id = secret_blob.id,
    updated_at = now()
from secret_blob
where credential.id = secret_blob.credential_id;

insert into pn_vault.vault_access_audit (
  actor_type,
  actor_ref,
  action,
  request_id,
  reason,
  after_state
) values (
  'HUMAN',
  'human:byok-e2e-seed',
  'STORE',
  extensions.gen_random_uuid(),
  'BYOK localhost E2E mock credential seed',
  'byok_live_e2e_smoke'
);

commit;
