begin;

-- Backfill any credential rows that already have a current secret blob but are missing
-- the current_master_key_id pointer required by pn_vault.consume_reference_token.
--
-- This preserves history:
-- - it does not rewrite secret blob content
-- - it does not revoke or replace existing receipts
-- - it only repairs the live pointer on the credential row
--
-- The statement is idempotent: rows that already have current_master_key_id set are left untouched.
update pn_vault.vault_credentials vc
set current_master_key_id = sb.master_key_id
from pn_vault.vault_secret_blobs sb
where vc.current_master_key_id is null
  and vc.current_secret_blob_id = sb.id
  and sb.master_key_id is not null;

commit;
