-- Formalize Phase 2 Content Schema with Multi-Tenant Routing & Artifact Version Mapping
-- Gatekeeper Requirement: Must not rely on zero-scope scans. Must strictly route by organization_id and map artifact_version_id.

DO $$
BEGIN
  -- Alter the base table pn_content_phase2.content_items
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'pn_content_phase2' AND table_name = 'content_items' AND column_name = 'organization_id') THEN
    ALTER TABLE pn_content_phase2.content_items ADD COLUMN organization_id uuid;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'pn_content_phase2' AND table_name = 'content_items' AND column_name = 'target_integration_key') THEN
    ALTER TABLE pn_content_phase2.content_items ADD COLUMN target_integration_key text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'pn_content_phase2' AND table_name = 'content_items' AND column_name = 'artifact_version_id') THEN
    ALTER TABLE pn_content_phase2.content_items ADD COLUMN artifact_version_id uuid;
  END IF;
END $$;

-- Stop migration and fail-closed if there are orphaned rows
DO $$
DECLARE
  v_orphan_count integer;
BEGIN
  SELECT count(*) INTO v_orphan_count FROM pn_content_phase2.content_items WHERE organization_id IS NULL;
  
  IF v_orphan_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: Found % orphaned content_items without organization_id. Manual backfill required.', v_orphan_count;
  END IF;
END $$;

-- Set NOT NULL and Constraints
ALTER TABLE pn_content_phase2.content_items ALTER COLUMN organization_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'content_items_org_fk') THEN
    ALTER TABLE pn_content_phase2.content_items
      ADD CONSTRAINT content_items_org_fk FOREIGN KEY (organization_id) REFERENCES portal_auth.organizations(id) ON DELETE RESTRICT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'content_items_org_key_unq') THEN
    ALTER TABLE pn_content_phase2.content_items
      ADD CONSTRAINT content_items_org_key_unq UNIQUE (organization_id, content_key);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'content_items_artifact_unq') THEN
    ALTER TABLE pn_content_phase2.content_items
      ADD CONSTRAINT content_items_artifact_unq UNIQUE (artifact_version_id);
  END IF;
END $$;

-- Strict RLS for pn_content_phase2.content_items via portal_auth.organization_memberships
ALTER TABLE pn_content_phase2.content_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for content_items" ON pn_content_phase2.content_items;
CREATE POLICY "Tenant isolation for content_items"
ON pn_content_phase2.content_items
FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM portal_auth.organization_memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM portal_auth.organization_memberships 
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Recreate public.phase2_content_items View and regrant privileges
DROP VIEW IF EXISTS public.phase2_content_items;
CREATE OR REPLACE VIEW public.phase2_content_items AS
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
  organization_id,
  target_integration_key,
  artifact_version_id
FROM pn_content_phase2.content_items;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.phase2_content_items TO anon, authenticated, service_role;

-- Mock Data RPC for Testing (Secure, Tenant-Scoped)
CREATE OR REPLACE FUNCTION public.phase076_mock_scheduled_content(
  p_organization_id uuid,
  p_integration_key text,
  p_content_key text,
  p_owner_ref text,
  p_title text,
  p_brief text,
  p_artifact_version_id uuid
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pn_content_phase2
AS $$
DECLARE
  v_item_id uuid;
BEGIN
  -- Ensure organization exists
  IF NOT EXISTS (SELECT 1 FROM portal_auth.organizations WHERE id = p_organization_id) THEN
    RAISE EXCEPTION 'INVALID_ORGANIZATION';
  END IF;

  -- Insert with initial state 'idea' to trigger SSOT accurately
  INSERT INTO pn_content_phase2.content_items (
    organization_id, target_integration_key, artifact_version_id, content_key, owner_ref, title, brief, state
  ) VALUES (
    p_organization_id, p_integration_key, p_artifact_version_id, p_content_key, p_owner_ref, p_title, p_brief, 'idea'
  ) RETURNING id INTO v_item_id;

  -- Do NOT forcefully update to scheduled. Return strictly in 'idea' state.
  RETURN v_item_id;
END;
$$;

REVOKE ALL ON FUNCTION public.phase076_mock_scheduled_content(uuid, text, text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.phase076_mock_scheduled_content(uuid, text, text, text, text, text, uuid) TO service_role;
