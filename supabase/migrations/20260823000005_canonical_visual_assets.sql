DROP FUNCTION IF EXISTS public.phase076_get_publish_payload(uuid, uuid, uuid, text);

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
  v_visual_assets text[];
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
        ORDER BY latest.reviewed_at DESC, latest.created_at DESC
        LIMIT 1
      )
  ) THEN
    RAISE EXCEPTION 'PHASE2_PUBLISH_REQUIRES_PASSED_QA';
  END IF;

  SELECT content INTO v_caption
  FROM pn_content_phase2.assets
  WHERE content_item_id = p_content_item_id
    AND artifact_type = 'caption_packet'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_caption IS NULL THEN
    RAISE EXCEPTION 'PHASE2_PUBLISH_MISSING_CAPTION';
  END IF;

  -- 1. Determine batch_id
  SELECT batch_id INTO v_batch_id
  FROM pn_content_phase2.assets
  WHERE content_item_id = p_content_item_id
    AND artifact_type = 'visual_asset'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_batch_id IS NULL THEN
    RAISE EXCEPTION 'PHASE2_PUBLISH_MISSING_VISUAL_ASSET';
  END IF;

  -- 2. Strictly filter by batch_id
  SELECT ARRAY(
    SELECT content
    FROM pn_content_phase2.assets
    WHERE content_item_id = p_content_item_id
      AND artifact_type = 'visual_asset'
      AND batch_id = v_batch_id
    ORDER BY created_at ASC
  ) INTO v_visual_assets;

  RETURN jsonb_build_object('caption', v_caption, 'visual_assets', v_visual_assets);
END;
$$;
