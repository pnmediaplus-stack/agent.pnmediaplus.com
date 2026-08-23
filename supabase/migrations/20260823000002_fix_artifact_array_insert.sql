ALTER TABLE pn_content_phase2.assets ADD COLUMN IF NOT EXISTS batch_id text;

CREATE OR REPLACE FUNCTION public.phase3_apply_stage_transition(
  p_organization_id uuid,
  p_content_item_id uuid,
  p_expected_current_state text,
  p_next_state text,
  p_actor_ref text,
  p_stage_payload jsonb,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_current_state text;
  v_organization_id uuid;
  v_owner_ref text;
  v_result jsonb;
  v_artifact jsonb;
  v_artifact_key text;
  v_artifact_type text;
  v_artifact_content_text text;
BEGIN
  -- 0. Absolute guard against NULL or empty idempotency
  IF p_idempotency_key IS NULL OR trim(p_idempotency_key) = '' THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'NULL_OR_EMPTY_IDEMPOTENCY_KEY');
  END IF;

  -- 1. Check Idempotency Guard
  IF EXISTS (
    SELECT 1 
    FROM pn_content_phase2.stage_transition_logs
    WHERE organization_id = p_organization_id
      AND content_item_id = p_content_item_id
      AND idempotency_key = p_idempotency_key
  ) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'content_item_id', p_content_item_id,
      'idempotency_hit', true,
      'message', 'Transition already applied safely.'
    );
  END IF;

  -- 2. Get content item and validate ownership
  SELECT state, organization_id, owner_ref INTO v_current_state, v_organization_id, v_owner_ref
  FROM pn_content_phase2.content_items
  WHERE id = p_content_item_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'CONTENT_NOT_FOUND');
  END IF;

  IF v_organization_id <> p_organization_id THEN
    RETURN jsonb_build_object('ok', false, 'error_code', 'OWNERSHIP_MISMATCH');
  END IF;

  -- 3. Validate current state
  IF v_current_state <> p_expected_current_state THEN
    RETURN jsonb_build_object(
      'ok', false, 
      'error_code', 'STATE_MISMATCH', 
      'expected', p_expected_current_state, 
      'actual', v_current_state
    );
  END IF;
  
  -- 4. Pre-Log Idempotency Key
  BEGIN
    INSERT INTO pn_content_phase2.stage_transition_logs (
      organization_id, content_item_id, expected_current_state, next_state, idempotency_key, actor_ref, stage_payload
    ) VALUES (
      p_organization_id, p_content_item_id, p_expected_current_state, p_next_state, p_idempotency_key, p_actor_ref, p_stage_payload
    );
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', true, 'content_item_id', p_content_item_id, 'idempotency_hit', true);
  END;

  -- 5. Insert Artifacts (Support Array of Artifacts)
  IF p_stage_payload ? 'artifacts' AND jsonb_array_length(p_stage_payload->'artifacts') > 0 THEN
    FOR v_artifact IN SELECT * FROM jsonb_array_elements(p_stage_payload->'artifacts')
    LOOP
      v_artifact_key := v_artifact->>'artifact_key';
      v_artifact_type := v_artifact->>'artifact_type';
      
      IF jsonb_typeof(v_artifact->'content') = 'string' THEN
        v_artifact_content_text := v_artifact->>'content';
      ELSE
        v_artifact_content_text := (v_artifact->'content')::text;
      END IF;

      IF v_artifact_key IS NULL OR v_artifact_type IS NULL OR v_artifact_content_text IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error_code', 'INVALID_ARTIFACT_PAYLOAD');
      END IF;

      BEGIN
        INSERT INTO pn_content_phase2.assets (
          content_item_id, asset_key, owner_ref, asset_type, asset_uri, batch_id
        ) VALUES (
          p_content_item_id, v_artifact_key, v_owner_ref, v_artifact_type::pn_content_phase2.asset_type, v_artifact_content_text, p_idempotency_key
        );
      EXCEPTION WHEN unique_violation THEN
        -- Allow idempotency to skip duplicate asset keys silently inside the array loop
      END;
    END LOOP;
  ELSE
    -- Require artifact unless transitioning to QA_ready or published
    IF p_next_state NOT IN ('QA_ready', 'published') THEN
      RETURN jsonb_build_object('ok', false, 'error_code', 'MISSING_STAGE_ARTIFACT');
    END IF;
  END IF;

  -- 6. Advance State
  UPDATE pn_content_phase2.content_items
  SET state = p_next_state::pn_content_phase2.content_state
  WHERE id = p_content_item_id;

  v_result := jsonb_build_object(
    'ok', true,
    'content_item_id', p_content_item_id,
    'from_state', v_current_state,
    'to_state', p_next_state,
    'inserted_artifacts', CASE WHEN p_stage_payload ? 'artifacts' THEN jsonb_array_length(p_stage_payload->'artifacts') ELSE 0 END,
    'idempotency_hit', false
  );

  RETURN v_result;
END;
$$;
