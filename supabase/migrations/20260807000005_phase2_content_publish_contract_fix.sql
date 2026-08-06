-- Corrective migration for the Phase 2 publish contract.
-- This is intentionally fail-closed: existing orphaned or cross-tenant rows stop the migration.

DO $$
BEGIN
  IF to_regclass('pn_content_phase2.content_items') IS NULL
     OR to_regclass('pn_os_ai_department.artifact_versions') IS NULL
     OR to_regclass('pn_os_ai_department.artifacts') IS NULL THEN
    RAISE EXCEPTION 'PHASE2_CONTRACT_SCHEMA_MISSING';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pn_content_phase2.content_items WHERE organization_id IS NULL
  ) THEN
    RAISE EXCEPTION 'PHASE2_ORGANIZATION_BACKFILL_REQUIRED';
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
    RAISE EXCEPTION 'PHASE2_CROSS_TENANT_ARTIFACT_MAPPING_FOUND';
  END IF;
END $$;

ALTER TABLE pn_content_phase2.content_items
  ALTER COLUMN organization_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'content_items_artifact_version_fk'
      AND conrelid = 'pn_content_phase2.content_items'::regclass
  ) THEN
    ALTER TABLE pn_content_phase2.content_items
      ADD CONSTRAINT content_items_artifact_version_fk
      FOREIGN KEY (artifact_version_id)
      REFERENCES pn_os_ai_department.artifact_versions(id)
      ON DELETE RESTRICT;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'content_items_content_key_key'
      AND conrelid = 'pn_content_phase2.content_items'::regclass
  ) THEN
    ALTER TABLE pn_content_phase2.content_items
      DROP CONSTRAINT content_items_content_key_key;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'content_items_org_key_unq'
      AND conrelid = 'pn_content_phase2.content_items'::regclass
  ) THEN
    ALTER TABLE pn_content_phase2.content_items
      ADD CONSTRAINT content_items_org_key_unq
      UNIQUE (organization_id, content_key);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION pn_content_phase2.validate_content_artifact_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pn_content_phase2, pn_os_ai_department, public, pg_temp
AS $$
BEGIN
  IF NEW.artifact_version_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM pn_os_ai_department.artifact_versions av
    JOIN pn_os_ai_department.artifacts a ON a.id = av.artifact_id
    WHERE av.id = NEW.artifact_version_id
      AND a.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION 'PHASE2_CROSS_TENANT_ARTIFACT_MAPPING_FORBIDDEN';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS content_items_artifact_tenant_guard ON pn_content_phase2.content_items;
CREATE TRIGGER content_items_artifact_tenant_guard
BEFORE INSERT OR UPDATE OF organization_id, artifact_version_id
ON pn_content_phase2.content_items
FOR EACH ROW
EXECUTE FUNCTION pn_content_phase2.validate_content_artifact_tenant();

ALTER TABLE pn_content_phase2.content_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Tenant isolation for content_items" ON pn_content_phase2.content_items;
CREATE POLICY "Tenant isolation for content_items"
ON pn_content_phase2.content_items
FOR ALL
USING (
  organization_id IN (
    SELECT organization_id
    FROM public.portal_organization_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM public.portal_organization_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  )
);

CREATE OR REPLACE VIEW public.phase2_content_items
WITH (security_invoker = true)
AS
SELECT
  id, content_key, owner_ref, title, brief, state,
  scheduled_at, published_at, created_at, updated_at,
  organization_id, target_integration_key, artifact_version_id
FROM pn_content_phase2.content_items;

REVOKE ALL ON public.phase2_content_items FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA pn_content_phase2 TO authenticated, service_role;
GRANT SELECT ON public.phase2_content_items TO authenticated, service_role;
GRANT SELECT ON pn_content_phase2.content_items TO authenticated, service_role;

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
    RAISE EXCEPTION 'PHASE2_DUPLICATE_ACTIVE_FACEBOOK_PUBLISH_RECORDS';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS publish_records_facebook_active_uniq
  ON pn_content_phase2.publish_records (content_item_id, channel)
  WHERE channel = 'facebook' AND status IN ('pending', 'published', 'success');

CREATE OR REPLACE FUNCTION public.phase076_get_publish_payload(
  p_organization_id uuid,
  p_content_item_id uuid,
  p_artifact_version_id uuid,
  p_integration_key text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pn_content_phase2, pn_os_ai_department, pg_temp
AS $$
DECLARE
  v_item record;
  v_caption text;
  v_image text;
BEGIN
  SELECT ci.* INTO v_item
  FROM pn_content_phase2.content_items ci
  JOIN pn_os_ai_department.artifact_versions av ON av.id = ci.artifact_version_id
  JOIN pn_os_ai_department.artifacts a
    ON a.id = av.artifact_id
   AND a.organization_id = ci.organization_id
  WHERE ci.id = p_content_item_id
    AND ci.organization_id = p_organization_id
    AND ci.artifact_version_id = p_artifact_version_id
    AND ci.target_integration_key = p_integration_key;

  IF v_item IS NULL THEN
    RAISE EXCEPTION 'PHASE2_PUBLISH_CONTRACT_MISMATCH';
  END IF;

  IF v_item.state <> 'scheduled' THEN
    RAISE EXCEPTION 'PHASE2_PUBLISH_REQUIRES_SCHEDULED: %', v_item.state;
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
    RAISE EXCEPTION 'PHASE2_PUBLISH_QA_NOT_APPROVED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pn_content_phase2.publish_records pr
    WHERE pr.content_item_id = p_content_item_id
      AND pr.channel = 'facebook'
      AND pr.status IN ('pending', 'published', 'success')
  ) THEN
    RAISE EXCEPTION 'PHASE2_FACEBOOK_PUBLISH_ALREADY_CLAIMED';
  END IF;

  SELECT asset_uri INTO v_caption
  FROM pn_content_phase2.assets
  WHERE content_item_id = p_content_item_id AND asset_type = 'caption_output'
  ORDER BY created_at DESC, id DESC LIMIT 1;

  SELECT asset_uri INTO v_image
  FROM pn_content_phase2.assets
  WHERE content_item_id = p_content_item_id AND asset_type = 'visual_asset'
  ORDER BY created_at DESC, id DESC LIMIT 1;

  IF nullif(btrim(v_caption), '') IS NULL OR nullif(btrim(v_image), '') IS NULL THEN
    RAISE EXCEPTION 'PHASE2_PUBLISH_REQUIRED_ASSET_MISSING';
  END IF;

  RETURN jsonb_build_object('caption', v_caption, 'image', v_image);
END;
$$;

REVOKE ALL ON FUNCTION public.phase076_get_publish_payload(uuid, uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.phase076_get_publish_payload(uuid, uuid, uuid, text)
  TO service_role;

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
SET search_path = public, pn_content_phase2, pn_os_ai_department, tenant_integration_vault, pn_vault, pg_temp
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

  INSERT INTO pn_content_phase2.content_items (
    organization_id, target_integration_key, artifact_version_id,
    content_key, owner_ref, title, brief, state
  ) VALUES (
    p_organization_id, p_integration_key, p_artifact_version_id,
    p_content_key, p_owner_ref, p_title, p_brief, 'idea'
  ) RETURNING id INTO v_item_id;

  INSERT INTO pn_content_phase2.assets (
    content_item_id, asset_key, owner_ref, asset_type, asset_uri
  ) VALUES
    (v_item_id, p_content_key || '_research', p_owner_ref, 'viral_research_packet', 'Mock research evidence for tenant-scoped E2E testing.'),
    (v_item_id, p_content_key || '_caption', p_owner_ref, 'caption_output', 'This is a mock caption for testing.'),
    (v_item_id, p_content_key || '_image', p_owner_ref, 'visual_asset', 'https://example.com/mock_image.jpg');

  UPDATE pn_content_phase2.content_items SET state = 'research_ready' WHERE id = v_item_id;
  UPDATE pn_content_phase2.content_items SET state = 'visual_ready' WHERE id = v_item_id;
  UPDATE pn_content_phase2.content_items SET state = 'caption_ready' WHERE id = v_item_id;
  UPDATE pn_content_phase2.content_items SET state = 'QA_ready' WHERE id = v_item_id;

  INSERT INTO pn_content_phase2.qa_reviews (
    content_item_id, reviewer_ref, verdict, average_score, overclaim_risk,
    missing_asset, evidence_ref, notes
  ) VALUES (
    v_item_id, 'phase2_test_fixture', 'pass', 9.0, 0,
    false, 'evidence://phase2-test-fixture/qa', 'Synthetic QA approval for controlled E2E testing.'
  );

  UPDATE pn_content_phase2.content_items SET state = 'QA_passed' WHERE id = v_item_id;
  UPDATE pn_content_phase2.content_items SET state = 'scheduled' WHERE id = v_item_id;

  RETURN v_item_id;
END;
$$;

REVOKE ALL ON FUNCTION public.phase076_prepare_test_fixture(uuid, text, text, text, text, text, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.phase076_prepare_test_fixture(uuid, text, text, text, text, text, uuid)
  TO service_role;

-- Atomically finalize a Facebook publish behind a tenant-scoped RPC.
CREATE OR REPLACE FUNCTION public.phase076_claim_facebook_publish(
  p_organization_id uuid,
  p_content_item_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pn_content_phase2, pg_temp
AS $$
DECLARE
  v_item pn_content_phase2.content_items%ROWTYPE;
  v_record_id uuid;
BEGIN
  SELECT * INTO v_item
  FROM pn_content_phase2.content_items
  WHERE id = p_content_item_id AND organization_id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PHASE2_PUBLISH_TENANT_OR_CONTENT_NOT_FOUND';
  END IF;

  IF v_item.state <> 'scheduled' THEN
    RAISE EXCEPTION 'PHASE2_PUBLISH_REQUIRES_SCHEDULED: %', v_item.state;
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
    RAISE EXCEPTION 'PHASE2_PUBLISH_QA_NOT_APPROVED';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pn_content_phase2.publish_records
    WHERE content_item_id = p_content_item_id
      AND channel = 'facebook'
      AND status IN ('pending', 'published', 'success')
  ) THEN
    RAISE EXCEPTION 'PHASE2_PUBLISH_ALREADY_CLAIMED';
  END IF;

  INSERT INTO pn_content_phase2.publish_records (content_item_id, channel, status)
  VALUES (p_content_item_id, 'facebook', 'pending')
  RETURNING id INTO v_record_id;

  RETURN jsonb_build_object('ok', true, 'publish_record_id', v_record_id);
END;
$$;

REVOKE ALL ON FUNCTION public.phase076_claim_facebook_publish(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.phase076_claim_facebook_publish(uuid, uuid)
  TO service_role;

CREATE OR REPLACE FUNCTION public.phase076_record_facebook_publish(
  p_organization_id uuid,
  p_content_item_id uuid,
  p_channel text,
  p_external_id text,
  p_external_url text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pn_content_phase2, pg_temp
AS $$
DECLARE
  v_item pn_content_phase2.content_items%ROWTYPE;
  v_record_id uuid;
  v_now timestamptz := now();
BEGIN
  IF p_channel <> 'facebook' OR nullif(btrim(p_external_id), '') IS NULL THEN
    RAISE EXCEPTION 'PHASE2_PUBLISH_INPUT_INVALID';
  END IF;

  SELECT * INTO v_item
  FROM pn_content_phase2.content_items
  WHERE id = p_content_item_id AND organization_id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PHASE2_PUBLISH_TENANT_OR_CONTENT_NOT_FOUND';
  END IF;

  IF v_item.state = 'published' THEN
    SELECT id INTO v_record_id
    FROM pn_content_phase2.publish_records
    WHERE content_item_id = p_content_item_id
      AND channel = 'facebook'
      AND status IN ('published', 'success')
    ORDER BY published_at DESC NULLS LAST, created_at DESC
    LIMIT 1;

    IF v_record_id IS NULL THEN
      RAISE EXCEPTION 'PHASE2_PUBLISH_STATE_LEDGER_MISMATCH';
    END IF;

    RETURN jsonb_build_object('ok', true, 'idempotent', true, 'publish_record_id', v_record_id);
  END IF;

  IF v_item.state <> 'scheduled' THEN
    RAISE EXCEPTION 'PHASE2_PUBLISH_STATE_INVALID: %', v_item.state;
  END IF;

  UPDATE pn_content_phase2.content_items
  SET state = 'published', published_at = v_now, updated_at = v_now
  WHERE id = p_content_item_id AND organization_id = p_organization_id;

  SELECT id INTO v_record_id
  FROM pn_content_phase2.publish_records
  WHERE content_item_id = p_content_item_id
    AND channel = p_channel
    AND status = 'pending'
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF v_record_id IS NULL THEN
    INSERT INTO pn_content_phase2.publish_records (
      content_item_id, channel, external_id, external_url, status, published_at, created_at, updated_at
    ) VALUES (
      p_content_item_id, p_channel, p_external_id, nullif(p_external_url, ''), 'published', v_now, v_now, v_now
    )
    RETURNING id INTO v_record_id;
  ELSE
    UPDATE pn_content_phase2.publish_records
    SET external_id = p_external_id,
        external_url = nullif(p_external_url, ''),
        status = 'published',
        published_at = v_now,
        updated_at = v_now
    WHERE id = v_record_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'idempotent', false, 'publish_record_id', v_record_id);
END;
$$;

REVOKE ALL ON FUNCTION public.phase076_record_facebook_publish(uuid, uuid, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.phase076_record_facebook_publish(uuid, uuid, text, text, text)
  TO service_role;

NOTIFY pgrst, 'reload schema';
