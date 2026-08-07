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
SET search_path = public, pn_content_phase2, pn_os_ai_department,
  tenant_integration_vault, pn_vault, pg_temp
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
    organization_id, target_integration_key, artifact_version_id,
    content_key, owner_ref, title, brief, state
  ) VALUES (
    p_organization_id, p_integration_key, p_artifact_version_id,
    p_content_key, p_owner_ref, p_title, p_brief, 'idea'
  ) RETURNING id INTO v_item_id;

  INSERT INTO pn_content_phase2.assets (
    content_item_id, asset_key, owner_ref, asset_type, asset_uri
  ) VALUES
    (v_item_id, p_content_key || '_research', p_owner_ref,
      'viral_research_packet', 'Tenant-scoped E2E research evidence.'),
    (v_item_id, p_content_key || '_caption', p_owner_ref,
      'caption_output', 'This is a controlled E2E publish test.'),
    (v_item_id, p_content_key || '_image', p_owner_ref,
      'visual_asset', v_image_url);

  UPDATE pn_content_phase2.content_items SET state = 'research_ready' WHERE id = v_item_id;
  UPDATE pn_content_phase2.content_items SET state = 'visual_ready' WHERE id = v_item_id;
  UPDATE pn_content_phase2.content_items SET state = 'caption_ready' WHERE id = v_item_id;
  UPDATE pn_content_phase2.content_items SET state = 'QA_ready' WHERE id = v_item_id;

  INSERT INTO pn_content_phase2.qa_reviews (
    content_item_id, reviewer_ref, verdict, average_score, overclaim_risk,
    missing_asset, evidence_ref, notes
  ) VALUES (
    v_item_id, 'phase2_test_fixture', 'pass', 9.0, 0,
    false, 'evidence://phase2-test-fixture/qa',
    'Synthetic QA approval for controlled E2E testing.'
  );

  UPDATE pn_content_phase2.content_items SET state = 'QA_passed' WHERE id = v_item_id;
  UPDATE pn_content_phase2.content_items SET state = 'scheduled' WHERE id = v_item_id;

  RETURN v_item_id;
END;
$$;

REVOKE ALL ON FUNCTION public.phase076_prepare_test_fixture_with_image(
  uuid, text, text, text, text, text, uuid, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.phase076_prepare_test_fixture_with_image(
  uuid, text, text, text, text, text, uuid, text
) TO service_role;

NOTIFY pgrst, 'reload schema';
