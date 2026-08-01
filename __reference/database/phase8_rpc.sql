-- 1. Unique constraint for request_id to prevent duplicates
ALTER TABLE public.phase2_llm_usage 
ADD CONSTRAINT phase2_llm_usage_request_id_key UNIQUE (request_id);

-- 2. RPC: reserve_llm_budget
CREATE OR REPLACE FUNCTION public.reserve_llm_budget(
    p_tenant_id text,
    p_actor_id text,
    p_provider text,
    p_model text,
    p_request_id text,
    p_reserve_cost numeric,
    p_daily_budget numeric
) RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_record_id uuid;
    v_current_cost numeric;
    -- Create a unique lock ID using hash of tenant_id and provider
    v_lock_id bigint := hashtext(p_tenant_id || p_provider);
BEGIN
    -- Acquire transaction-level advisory lock
    PERFORM pg_advisory_xact_lock(v_lock_id);

    -- Check for duplicate request_id first
    IF EXISTS (SELECT 1 FROM public.phase2_llm_usage WHERE request_id = p_request_id) THEN
        RAISE EXCEPTION 'DUPLICATE_REQUEST_ID';
    END IF;

    -- Calculate current cost (including PENDING and COMPLETED) in last 24h
    SELECT COALESCE(SUM(estimated_cost), 0) INTO v_current_cost
    FROM public.phase2_llm_usage
    WHERE tenant_id = p_tenant_id 
      AND provider = p_provider
      AND status IN ('COMPLETED', 'PENDING')
      AND created_at >= NOW() - INTERVAL '24 HOURS';

    -- Check against budget
    IF (v_current_cost + p_reserve_cost) > p_daily_budget THEN
        RAISE EXCEPTION 'LLM_QUOTA_EXCEEDED';
    END IF;

    -- Insert PENDING record
    INSERT INTO public.phase2_llm_usage (
        tenant_id, actor_id, provider, model, request_id, 
        prompt_tokens, completion_tokens, total_tokens, 
        estimated_cost, status
    ) VALUES (
        p_tenant_id, p_actor_id, p_provider, p_model, p_request_id,
        0, 0, 0, p_reserve_cost, 'PENDING'
    ) RETURNING id INTO v_record_id;

    RETURN v_record_id;
END;
$$;

-- 3. RPC: finalize_llm_usage
CREATE OR REPLACE FUNCTION public.finalize_llm_usage(
    p_record_id uuid,
    p_status text,
    p_prompt_tokens integer,
    p_completion_tokens integer,
    p_total_tokens integer,
    p_estimated_cost numeric
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE public.phase2_llm_usage
    SET 
        status = p_status,
        prompt_tokens = p_prompt_tokens,
        completion_tokens = p_completion_tokens,
        total_tokens = p_total_tokens,
        estimated_cost = p_estimated_cost
    WHERE id = p_record_id;
END;
$$;
