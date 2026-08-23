-- Add artifacts column to content_items
ALTER TABLE pn_content_phase2.content_items ADD COLUMN IF NOT EXISTS artifacts JSONB DEFAULT '{}'::jsonb;

-- Recreate the view to include artifacts
CREATE OR REPLACE VIEW public.phase2_content_items
WITH (security_invoker = true)
AS
SELECT
  id,
  content_key,
  owner_ref,
  title,
  brief,
  state,
  scheduled_at,
  published_at,
  created_at,
  updated_at,
  campaign_id,
  organization_id,
  target_integration_key,
  artifact_version_id,
  artifacts
FROM pn_content_phase2.content_items;

-- Revoke all write permissions to enforce server boundary, grant only SELECT (these are safe to re-run)
REVOKE ALL ON public.phase2_content_items FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA pn_content_phase2 TO authenticated, service_role;
GRANT SELECT ON public.phase2_content_items TO authenticated, service_role;
GRANT SELECT ON pn_content_phase2.content_items TO authenticated, service_role;


GRANT INSERT ON public.phase2_content_items TO authenticated, service_role;
GRANT INSERT ON pn_content_phase2.content_items TO authenticated, service_role;
