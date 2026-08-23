-- Backfill existing assets
UPDATE pn_content_phase2.assets
SET batch_id = 'legacy_' || content_item_id::text
WHERE batch_id IS NULL;

-- Make batch_id NOT NULL to strictly enforce the contract
ALTER TABLE pn_content_phase2.assets ALTER COLUMN batch_id SET NOT NULL;

-- 1. Update test fixture 1
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
    organization_id, target_integration_key, artifact_version_id, content_key, owner_ref, title, brief, state
  ) VALUES (
    p_organization_id, p_integration_key, p_artifact_version_id, p_content_key, p_owner_ref, p_title, p_brief, 'idea'
  ) RETURNING id INTO v_item_id;

  INSERT INTO pn_content_phase2.assets (content_item_id, asset_key, owner_ref, asset_type, asset_uri, batch_id)
  VALUES 
    (v_item_id, p_content_key || '_research', p_owner_ref, 'viral_research_packet', 'Mock research evidence for tenant-scoped E2E testing.', 'fixture_' || p_content_key),
    (v_item_id, p_content_key || '_caption', p_owner_ref, 'caption_output', 'This is a mock caption for testing.', 'fixture_' || p_content_key),
    (v_item_id, p_content_key || '_image', p_owner_ref, 'visual_asset', 'https://example.com/mock_image.jpg', 'fixture_' || p_content_key);

  RETURN v_item_id;
END;
$$;

-- 2. Update test fixture 2
CREATE OR REPLACE FUNCTION public.phase076_prepare_test_fixture_with_image(
  p_organization_id uuid,
  p_integration_key text,
  p_content_key text,
  p_owner_ref text,
  p_title text,
  p_brief text,
  p_artifact_version_id uuid,
  p_image_url text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pn_content_phase2, pn_os_ai_department, tenant_integration_vault, pn_vault, pg_temp
AS $$
DECLARE
  v_item_id uuid;
  v_image_url text := nullif(btrim(p_image_url), '');
BEGIN
  IF v_image_url IS NULL OR v_image_url !~* '^https://[^[:space:]]+$' THEN
    RAISE EXCEPTION 'PHASE076_IMAGE_URL_INVALID';
  END IF;

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
    organization_id, target_integration_key, artifact_version_id, content_key, owner_ref, title, brief, state
  ) VALUES (
    p_organization_id, p_integration_key, p_artifact_version_id, p_content_key, p_owner_ref, p_title, p_brief, 'idea'
  ) RETURNING id INTO v_item_id;

  INSERT INTO pn_content_phase2.assets (
    content_item_id, asset_key, owner_ref, asset_type, asset_uri, batch_id
  ) VALUES
    (v_item_id, p_content_key || '_research', p_owner_ref, 'viral_research_packet', 'Tenant-scoped E2E research evidence.', 'fixture_img_' || p_content_key),
    (v_item_id, p_content_key || '_caption', p_owner_ref, 'caption_output', 'This is a controlled E2E publish test.', 'fixture_img_' || p_content_key),
    (v_item_id, p_content_key || '_image', p_owner_ref, 'visual_asset', v_image_url, 'fixture_img_' || p_content_key);

  UPDATE pn_content_phase2.content_items SET state = 'research_ready' WHERE id = v_item_id;
  UPDATE pn_content_phase2.content_items SET state = 'visual_ready' WHERE id = v_item_id;
  UPDATE pn_content_phase2.content_items SET state = 'caption_ready' WHERE id = v_item_id;
  UPDATE pn_content_phase2.content_items SET state = 'QA_ready' WHERE id = v_item_id;

  INSERT INTO pn_content_phase2.qa_reviews (
    content_item_id, reviewer_ref, verdict, average_score, overclaim_risk, missing_asset, evidence_ref, notes
  ) VALUES (
    v_item_id, 'phase2_test_fixture', 'pass', 9.0, 0, false, 'evidence://phase2-test-fixture/qa', 'Synthetic QA approval for controlled E2E testing.'
  );

  UPDATE pn_content_phase2.content_items SET state = 'QA_passed' WHERE id = v_item_id;
  UPDATE pn_content_phase2.content_items SET state = 'scheduled' WHERE id = v_item_id;

  RETURN v_item_id;
END;
$$;

-- 3. Update get_publish_payload to strictly filter by batch_id without fallbacks
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
  v_images text[];
  v_batch_id text;
BEGIN
  SELECT ci.* INTO v_item
  FROM pn_content_phase2.content_items ci
  JOIN pn_os_ai_department.artifact_versions av ON av.id = ci.artifact_version_id
  JOIN pn_os_ai_department.artifacts a ON a.id = av.artifact_id AND a.organization_id = ci.organization_id
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
    SELECT 1 FROM pn_content_phase2.qa_reviews qr
    WHERE qr.content_item_id = p_content_item_id
      AND qr.verdict IN ('pass', 'pass_with_conditions')
      AND qr.average_score >= 7
      AND qr.overclaim_risk <= 3
      AND qr.missing_asset = false
      AND qr.id = (
        SELECT latest.id FROM pn_content_phase2.qa_reviews latest
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

  -- Strictly extract batch_id from the latest visual asset and use it as a binding contract
  SELECT batch_id INTO v_batch_id
  FROM pn_content_phase2.assets
  WHERE content_item_id = p_content_item_id AND asset_type = 'visual_asset'
  ORDER BY created_at DESC, id DESC LIMIT 1;

  IF v_batch_id IS NULL THEN
    RAISE EXCEPTION 'PHASE2_PUBLISH_CORRUPT_BATCH_ID';
  END IF;

  SELECT array_agg(asset_uri ORDER BY asset_key ASC) INTO v_images
  FROM pn_content_phase2.assets
  WHERE content_item_id = p_content_item_id 
    AND asset_type = 'visual_asset'
    AND batch_id = v_batch_id;

  IF nullif(btrim(v_caption), '') IS NULL OR array_length(v_images, 1) IS NULL THEN
    RAISE EXCEPTION 'PHASE2_PUBLISH_REQUIRED_ASSET_MISSING';
  END IF;

  RETURN jsonb_build_object('caption', v_caption, 'images', v_images);
END;
$$;
