-- Read-only preflight. Run phase2_content_legacy_backfill_prepare.sql first.
-- Manually confirm every returned row belongs to PN MEDIA PLUS.

select
  id,
  content_key,
  owner_ref,
  title,
  state,
  organization_id,
  target_integration_key,
  artifact_version_id,
  created_at
from pn_content_phase2.content_items
where organization_id is null
order by created_at, id;

select
  count(*) as orphan_row_count
from pn_content_phase2.content_items
where organization_id is null;
