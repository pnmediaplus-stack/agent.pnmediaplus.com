-- Description: Safely add text-embedding-3-small to openai provider models catalog

DO $$
DECLARE
  v_provider_id uuid;
  v_metadata jsonb;
  v_models jsonb;
  v_new_model jsonb;
  v_has_model boolean;
BEGIN
  -- Lấy provider_id của openai
  SELECT id, public_metadata INTO v_provider_id, v_metadata
  FROM public.phase070_integration_provider_catalog
  WHERE provider_code = 'openai';

  IF v_provider_id IS NOT NULL THEN
    v_models := COALESCE(v_metadata->'models', '[]'::jsonb);
    
    -- Kiểm tra xem model đã tồn tại chưa
    SELECT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_models) AS m 
      WHERE m->>'code' = 'text-embedding-3-small'
    ) INTO v_has_model;
    
    IF NOT v_has_model THEN
      v_new_model := '{
        "code": "text-embedding-3-small",
        "endpoint": "https://api.openai.com/v1/embeddings",
        "capability": "embedding",
        "prompt_cost": 0.02,
        "completion_cost": 0
      }'::jsonb;
      
      -- Nối model mới vào mảng models hiện tại
      v_models := v_models || v_new_model;
      
      -- Cập nhật lại public_metadata một cách an toàn
      UPDATE public.phase070_integration_provider_catalog
      SET public_metadata = jsonb_set(COALESCE(public_metadata, '{}'::jsonb), '{models}', v_models)
      WHERE id = v_provider_id;
    END IF;
  END IF;
END $$;
