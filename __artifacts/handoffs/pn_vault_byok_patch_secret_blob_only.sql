-- PN Vault BYOK secret blob patch only
-- Fixes existing credential_ref = byok_live_e2e_smoke when current_secret_blob_id is null.
-- Does not contain plaintext API key.

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
  update pn_vault.vault_credentials credential
  set current_master_key_id = master_key.id,
      state = 'ACTIVE',
      updated_at = now()
  from master_key
  where credential.credential_ref = 'byok_live_e2e_smoke'
  returning credential.id, credential.current_master_key_id
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

commit;
