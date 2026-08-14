begin;

-- Backfill the missing master-key pointer for the existing Fal.ai vault credential.
-- This does not rewrite secret blobs or receipts, so the historical secret lineage
-- remains intact. It only repairs the current credential pointer that BYOK consume
-- needs in order to treat the package as ready.
do $$
declare
  v_credential_ref text := '8289488ab2554cb69bffc9d2e71af160__fal_ai__fal_ai_1786636840915';
  v_master_key_ref text := 'byok_master';
  v_master_key_id uuid;
  v_credential_id uuid;
  v_current_master_key_id uuid;
begin
  select id
    into v_master_key_id
  from pn_vault.vault_master_keys
  where key_ref = v_master_key_ref
    and active = true
  order by activated_at desc, created_at desc
  limit 1;

  if v_master_key_id is null then
    raise exception 'PN_VAULT_MASTER_KEY_NOT_FOUND: %', v_master_key_ref using errcode = 'P0001';
  end if;

  select id, current_master_key_id
    into v_credential_id, v_current_master_key_id
  from pn_vault.vault_credentials
  where credential_ref = v_credential_ref;

  if v_credential_id is null then
    raise exception 'PN_VAULT_CREDENTIAL_NOT_FOUND: %', v_credential_ref using errcode = 'P0001';
  end if;

  -- Idempotent repair: only fill the pointer if it is currently missing.
  if v_current_master_key_id is null then
    update pn_vault.vault_credentials
      set current_master_key_id = v_master_key_id
    where id = v_credential_id;
  end if;
end;
$$;

commit;
