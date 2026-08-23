DROP FUNCTION IF EXISTS public.phase076_get_publish_payload(uuid, uuid, uuid, text);
DROP FUNCTION IF EXISTS public.phase076_get_publish_payload(uuid, uuid, text);

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
  v_execution_id text;
BEGIN
  -- We include artifact_version_id in the lookup for security and SSOT parity
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

  -- Phase 3 Submit Visual generates visual_asset keys like: vis_EXECUTIONID_...
  -- We extract the EXECUTIONID from the latest visual asset, and grab all assets with that exact execution ID
  -- The key format is: vis_${execution.id}_${i}_${item.id} OR vis_${execution.id}_${item.id}
  SELECT split_part(asset_key, '_', 2) INTO v_execution_id
  FROM pn_content_phase2.assets
  WHERE content_item_id = p_content_item_id AND asset_type = 'visual_asset'
  ORDER BY created_at DESC, id DESC LIMIT 1;

  IF v_execution_id IS NOT NULL THEN
    SELECT array_agg(asset_uri ORDER BY asset_key ASC) INTO v_images
    FROM pn_content_phase2.assets
    WHERE content_item_id = p_content_item_id 
      AND asset_type = 'visual_asset'
      AND asset_key LIKE 'vis_' || v_execution_id || '_%';
  END IF;

  IF nullif(btrim(v_caption), '') IS NULL OR array_length(v_images, 1) IS NULL THEN
    RAISE EXCEPTION 'PHASE2_PUBLISH_REQUIRED_ASSET_MISSING';
  END IF;

  RETURN jsonb_build_object('caption', v_caption, 'images', v_images);
END;
$$;

REVOKE ALL ON FUNCTION public.phase076_get_publish_payload(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.phase076_get_publish_payload(uuid, uuid, uuid, text) TO service_role;
