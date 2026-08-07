-- Schema-only prepare. This adds nullable columns and changes no row data.
-- Run once before phase2_content_legacy_backfill_preflight.sql.

alter table pn_content_phase2.content_items
  add column if not exists organization_id uuid,
  add column if not exists target_integration_key text,
  add column if not exists artifact_version_id uuid;
