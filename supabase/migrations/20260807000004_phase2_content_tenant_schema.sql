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

  -- Preserve the legacy view column used by the existing governance surface.
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'pn_content_phase2' AND table_name = 'content_items' AND column_name = 'campaign_id') THEN
    ALTER TABLE pn_content_phase2.content_items ADD COLUMN campaign_id uuid;
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

-- Check for duplicates before dropping global constraint
DO $$
DECLARE
  v_duplicate_count integer;
BEGIN
  SELECT count(*) INTO v_duplicate_count FROM (
    SELECT content_key FROM pn_content_phase2.content_items GROUP BY content_key HAVING count(*) > 1
  ) dupes;

  IF v_duplicate_count > 0 THEN
    RAISE EXCEPTION 'Migration failed: Found % duplicate content_keys. Cannot safely alter unique constraints.', v_duplicate_count;
  END IF;
END $$;

-- Set NOT NULL and Constraints
ALTER TABLE pn_content_phase2.content_items ALTER COLUMN organization_id SET NOT NULL;

DO $$
BEGIN
  IF to_regclass('pn_os_ai_department.artifact_versions') IS NULL
     OR to_regclass('pn_os_ai_department.artifacts') IS NULL THEN
    RAISE EXCEPTION 'Migration failed: artifact SSOT tables are missing.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pn_content_phase2.content_items ci
    WHERE ci.artifact_version_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM pn_os_ai_department.artifact_versions av
        JOIN pn_os_ai_department.artifacts a ON a.id = av.artifact_id
        WHERE av.id = ci.artifact_version_id
          AND a.organization_id = ci.organization_id
      )
  ) THEN
    RAISE EXCEPTION 'Migration failed: content_items contains invalid or cross-tenant artifact_version_id mappings.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'content_items_org_fk') THEN
    ALTER TABLE pn_content_phase2.content_items
      ADD CONSTRAINT content_items_org_fk FOREIGN KEY (organization_id) REFERENCES portal_auth.organizations(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'content_items_artifact_version_fk') THEN
    ALTER TABLE pn_content_phase2.content_items
      ADD CONSTRAINT content_items_artifact_version_fk
      FOREIGN KEY (artifact_version_id) REFERENCES pn_os_ai_department.artifact_versions(id) ON DELETE RESTRICT;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'content_items_content_key_key') THEN
    ALTER TABLE pn_content_phase2.content_items DROP CONSTRAINT content_items_content_key_key;
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

-- Strict RLS for pn_content_phase2.content_items via public membership mapping.
ALTER TABLE pn_content_phase2.content_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation for content_items" ON pn_content_phase2.content_items;
CREATE POLICY "Tenant isolation for content_items"
ON pn_content_phase2.content_items
FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.portal_organization_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.portal_organization_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

-- Replace the view definition without dropping it; governance views depend on it.
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
  artifact_version_id
FROM pn_content_phase2.content_items;

-- Revoke all write permissions to enforce server boundary, grant only SELECT
REVOKE ALL ON public.phase2_content_items FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA pn_content_phase2 TO authenticated, service_role;
GRANT SELECT ON public.phase2_content_items TO authenticated, service_role;
GRANT SELECT ON pn_content_phase2.content_items TO authenticated, service_role;

-- Publish ledger used by the executor for replay protection.
CREATE TABLE IF NOT EXISTS pn_content_phase2.publish_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_item_id uuid NOT NULL REFERENCES pn_content_phase2.content_items(id) ON DELETE RESTRICT,
  asset_id uuid REFERENCES pn_content_phase2.assets(id) ON DELETE SET NULL,
  channel text NOT NULL,
  external_id text,
  external_url text,
  status text NOT NULL DEFAULT 'pending',
  published_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pn_content_phase2.publish_records
    WHERE channel = 'facebook'
    GROUP BY content_item_id, channel
    HAVING count(*) FILTER (WHERE status IN ('pending', 'published', 'success')) > 1
  ) THEN
    RAISE EXCEPTION 'Migration failed: duplicate active Facebook publish records exist.';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS publish_records_facebook_active_uniq
  ON pn_content_phase2.publish_records (content_item_id, channel)
  WHERE channel = 'facebook' AND status IN ('pending', 'published', 'success');

-- RPC for N8N payload resolution (SSOT)
CREATE OR REPLACE FUNCTION public.phase076_get_publish_payload(
  p_organization_id uuid,
  p_content_item_id uuid,
  p_artifact_version_id uuid,
  p_integration_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pn_content_phase2, pg_temp
AS $$
DECLARE
  v_item record;
  v_caption text;
  v_image text;
BEGIN
  -- Strict validation of tenant, integration, artifact, and state
  SELECT ci.*
    INTO v_item
  FROM pn_content_phase2.content_items ci
  JOIN pn_os_ai_department.artifact_versions av
    ON av.id = ci.artifact_version_id
  JOIN pn_os_ai_department.artifacts a
    ON a.id = av.artifact_id
   AND a.organization_id = ci.organization_id
  WHERE ci.id = p_content_item_id
    AND ci.organization_id = p_organization_id
    AND ci.artifact_version_id = p_artifact_version_id
    AND ci.target_integration_key = p_integration_key;

  IF v_item IS NULL THEN
    RAISE EXCEPTION 'Payload rejected: Contract mismatch or unauthorized tenant access.';
  END IF;

  IF v_item.state <> 'scheduled' THEN
    RAISE EXCEPTION 'Payload rejected: Content state % is not valid for publishing.', v_item.state;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pn_content_phase2.qa_reviews qr
    WHERE qr.content_item_id = p_content_item_id
      AND qr.verdict IN ('pass', 'pass_with_conditions')
      AND qr.average_score >= 7
      AND qr.overclaim_risk <= 3
      AND qr.missing_asset = false
      AND qr.id = (
        SELECT latest.id
        FROM pn_content_phase2.qa_reviews latest
        WHERE latest.content_item_id = p_content_item_id
        ORDER BY latest.reviewed_at DESC, latest.created_at DESC, latest.id DESC
        LIMIT 1
      )
  ) THEN
    RAISE EXCEPTION 'Payload rejected: Current QA approval is missing or invalid.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pn_content_phase2.publish_records pr
    WHERE pr.content_item_id = p_content_item_id
      AND pr.channel = 'facebook'
      AND pr.status IN ('pending', 'published', 'success')
  ) THEN
    RAISE EXCEPTION 'Payload rejected: Facebook publish already claimed or completed.';
  END IF;

  -- Fetch assets securely
  SELECT asset_uri INTO v_caption FROM pn_content_phase2.assets 
  WHERE content_item_id = p_content_item_id AND asset_type = 'caption_output'
  ORDER BY created_at DESC, id DESC LIMIT 1;
  
  SELECT asset_uri INTO v_image FROM pn_content_phase2.assets 
  WHERE content_item_id = p_content_item_id AND asset_type = 'visual_asset'
  ORDER BY created_at DESC, id DESC LIMIT 1;

  IF nullif(btrim(coalesce(v_caption, '')), '') IS NULL
     OR nullif(btrim(coalesce(v_image, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Payload rejected: Required Facebook assets are missing.';
  END IF;

  RETURN jsonb_build_object(
    'caption', v_caption,
    'image', v_image
  );
END;
$$;

REVOKE ALL ON FUNCTION public.phase076_get_publish_payload(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.phase076_get_publish_payload(uuid, uuid, uuid, text) TO service_role;

-- Mock Data RPC for Testing (Secure, Tenant-Scoped)
CREATE OR REPLACE FUNCTION public.phase076_prepare_test_fixture(
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
SET search_path = public, pn_content_phase2, tenant_integration_vault, pn_vault, pg_temp
AS $$
DECLARE
  v_item_id uuid;
BEGIN
  IF p_artifact_version_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM pn_os_ai_department.artifact_versions av
    JOIN pn_os_ai_department.artifacts a ON a.id = av.artifact_id
    WHERE av.id = p_artifact_version_id
      AND a.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'INVALID_ARTIFACT_VERSION_OR_TENANT';
  END IF;

  -- Ensure the integration and its Vault credential belong to the same organization.
  IF NOT EXISTS (
    SELECT 1
    FROM tenant_integration_vault.tenant_integrations ti
    JOIN pn_vault.vault_credentials vc ON vc.credential_ref = ti.vault_credential_ref
    WHERE ti.organization_id = p_organization_id
      AND ti.integration_key = p_integration_key
      AND ti.status IN ('active', 'configured')
  ) THEN
    RAISE EXCEPTION 'INVALID_INTEGRATION_OR_TENANT';
  END IF;

  -- 2. Insert with initial state 'idea' to trigger SSOT accurately
  INSERT INTO pn_content_phase2.content_items (
    organization_id, target_integration_key, artifact_version_id, content_key, owner_ref, title, brief, state
  ) VALUES (
    p_organization_id, p_integration_key, p_artifact_version_id, p_content_key, p_owner_ref, p_title, p_brief, 'idea'
  ) RETURNING id INTO v_item_id;

  -- 3. Insert required assets for publish payload
  INSERT INTO pn_content_phase2.assets (content_item_id, asset_key, owner_ref, asset_type, asset_uri)
  VALUES 
    (v_item_id, p_content_key || '_caption', p_owner_ref, 'caption_output', 'This is a mock caption for testing.'),
    (v_item_id, p_content_key || '_image', p_owner_ref, 'visual_asset', 'https://example.com/mock_image.jpg');

  -- 4. Do NOT forcefully update to scheduled. Return strictly in 'idea' state.
  -- The test script will output the fixture payload, but N8N execution will be blocked
  -- if the webhook expects 'scheduled'. True E2E requires state transitions.
  RETURN v_item_id;
END;
$$;

REVOKE ALL ON FUNCTION public.phase076_prepare_test_fixture(uuid, text, text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.phase076_prepare_test_fixture(uuid, text, text, text, text, text, uuid) TO service_role;
