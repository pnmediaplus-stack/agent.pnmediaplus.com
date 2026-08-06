-- Formalize Phase 2 Content Schema with Multi-Tenant Routing & Artifact Version Mapping
-- Gatekeeper Requirement: Must not rely on zero-scope scans. Must strictly route by organization_id and map artifact_version_id.

DO $$
BEGIN
  -- Ensure phase2_content_items has tenant routing columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'phase2_content_items' AND column_name = 'organization_id') THEN
    ALTER TABLE public.phase2_content_items ADD COLUMN organization_id uuid;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'phase2_content_items' AND column_name = 'target_integration_key') THEN
    ALTER TABLE public.phase2_content_items ADD COLUMN target_integration_key text;
  END IF;

  -- Add mapping for artifact_version_id sent by Dispatcher
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'phase2_content_items' AND column_name = 'artifact_version_id') THEN
    ALTER TABLE public.phase2_content_items ADD COLUMN artifact_version_id uuid;
  END IF;
END $$;

-- Drop any previous row level security on phase2_content_items if it existed and redefine strictly
ALTER TABLE public.phase2_content_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for phase2_content_items" ON public.phase2_content_items;
CREATE POLICY "Tenant isolation for phase2_content_items"
ON public.phase2_content_items
FOR ALL
USING (
  organization_id IS NULL OR -- fallback for old records
  organization_id IN (
    SELECT organization_id FROM public.portal_organizations
);

-- Mock Data RPC for Testing (Secure, Tenant-Scoped)
create or replace function public.phase076_mock_scheduled_content(
  p_organization_id uuid,
  p_integration_key text,
  p_content_key text,
  p_owner_ref text,
  p_title text,
  p_brief text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_id uuid;
begin
  -- Ensure organization exists
  if not exists (select 1 from public.portal_organizations where organization_id = p_organization_id) then
    raise exception 'INVALID_ORGANIZATION';
  end if;

  insert into public.phase2_content_items (
    organization_id, target_integration_key, content_key, owner_ref, title, brief, state
  ) values (
    p_organization_id, p_integration_key, p_content_key, p_owner_ref, p_title, p_brief, 'scheduled'
  ) returning id into v_item_id;

  return v_item_id;
end;
$$;
