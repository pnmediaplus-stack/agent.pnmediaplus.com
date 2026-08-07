-- Manual, one-time backfill for the 15 legacy Phase 2 rows currently in Production.
-- Run phase2_content_legacy_backfill_preflight.sql first and manually confirm every row.
-- This does not invent artifact or integration mappings.

begin;

do $$
declare
  v_org_id uuid := '8289488a-b255-4cb6-9bff-c9d2e71af160';
  v_orphan_count integer;
  v_org_count integer;
  v_updated integer;
begin
  select count(*)
    into v_org_count
  from portal_auth.organizations
  where id = v_org_id
    and status = 'active';

  if v_org_count <> 1 then
    raise exception 'PHASE2_BACKFILL_ORGANIZATION_INVALID: expected one active organization, got %', v_org_count
      using errcode = 'P0001';
  end if;

  alter table pn_content_phase2.content_items
    add column if not exists organization_id uuid,
    add column if not exists target_integration_key text,
    add column if not exists artifact_version_id uuid;

  select count(*)
    into v_orphan_count
  from pn_content_phase2.content_items
  where organization_id is null;

  if v_orphan_count <> 15 then
    raise exception 'PHASE2_BACKFILL_SCOPE_CHANGED: expected 15 orphaned rows, got %', v_orphan_count
      using errcode = 'P0001';
  end if;

  update pn_content_phase2.content_items
  set organization_id = v_org_id
  where organization_id is null;

  get diagnostics v_updated = row_count;

  if v_updated <> 15 then
    raise exception 'PHASE2_BACKFILL_ROWCOUNT_MISMATCH: expected 15 updates, got %', v_updated
      using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from pn_content_phase2.content_items
    where organization_id is null
  ) then
    raise exception 'PHASE2_BACKFILL_INCOMPLETE'
      using errcode = 'P0001';
  end if;
end $$;

select
  count(*) as total_content_items,
  count(*) filter (where organization_id = '8289488a-b255-4cb6-9bff-c9d2e71af160') as pn_media_plus_items,
  count(*) filter (where artifact_version_id is not null) as mapped_artifact_items,
  count(*) filter (where target_integration_key is not null) as routed_items
from pn_content_phase2.content_items;

commit;
