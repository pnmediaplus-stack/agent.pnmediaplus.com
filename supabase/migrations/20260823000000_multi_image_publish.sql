DROP FUNCTION IF EXISTS public.phase076_get_publish_payload(uuid, uuid, uuid, text);

CREATE OR REPLACE FUNCTION public.phase076_get_publish_payload(
  p_organization_id uuid,
  p_content_item_id uuid,
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
BEGIN
  SELECT ci.* INTO v_item
  FROM pn_content_phase2.content_items ci
  WHERE ci.id = p_content_item_id
    AND ci.organization_id = p_organization_id
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

  -- Extract ALL visual assets for the latest artifact run
  -- Wait, artifacts could be from multiple retries.
  -- We should get all visual assets associated with the specific generation batch.
  -- Since we didn't store a batch ID directly on assets easily, we order by id and take the ones that share the same created_at (roughly) or just grab all visual_assets for the content item, assuming they are cleaned up or we take the latest N.
  -- Wait, the assets are inserted in a loop. Their created_at might be milliseconds apart.
  -- Let's just get the most recent N assets if they were created within 1 minute of each other.
  -- Or better, `pn_content_phase2.assets` has `artifact_key`. If we use the new phase 3, we generate `vis_..._0_...`, `vis_..._1_...`.
  -- Since we just want all images from the *latest generation run*, we can find the latest created_at for visual_asset, and take all visual_assets created within 1 minute of it.
  
  SELECT array_agg(asset_uri ORDER BY id ASC) INTO v_images
  FROM (
    SELECT asset_uri
    FROM pn_content_phase2.assets
    WHERE content_item_id = p_content_item_id 
      AND asset_type = 'visual_asset'
      AND created_at >= (
        SELECT created_at - interval '1 minute'
        FROM pn_content_phase2.assets
        WHERE content_item_id = p_content_item_id AND asset_type = 'visual_asset'
        ORDER BY created_at DESC LIMIT 1
      )
  ) recent_assets;

  IF nullif(btrim(v_caption), '') IS NULL OR array_length(v_images, 1) IS NULL THEN
    RAISE EXCEPTION 'PHASE2_PUBLISH_REQUIRED_ASSET_MISSING';
  END IF;

  RETURN jsonb_build_object('caption', v_caption, 'images', v_images);
END;
$$;
