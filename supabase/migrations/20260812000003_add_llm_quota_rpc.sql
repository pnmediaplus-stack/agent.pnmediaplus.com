-- Bảng lưu trữ lịch sử tiêu thụ LLM (Billing & Usage)
CREATE TABLE IF NOT EXISTS public.phase2_llm_usage (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id text,
    actor_id text NOT NULL,
    provider text NOT NULL, -- e.g., 'openai', 'anthropic'
    model text NOT NULL,
    request_id text,
    prompt_tokens integer NOT NULL DEFAULT 0,
    completion_tokens integer NOT NULL DEFAULT 0,
    total_tokens integer NOT NULL DEFAULT 0,
    estimated_cost numeric(10, 6) DEFAULT 0.0,
    status text NOT NULL, -- 'PENDING', 'COMPLETED', 'FAILED', 'BLOCKED'
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Index tối ưu truy vấn quota theo actor và thời gian
CREATE INDEX IF NOT EXISTS idx_llm_usage_actor_time ON public.phase2_llm_usage (actor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_llm_usage_tenant_time ON public.phase2_llm_usage (tenant_id, created_at);

-- Tạo View lấy tổng usage trong 24h qua cho từng tenant
CREATE OR REPLACE VIEW public.phase2_llm_usage_daily AS
SELECT tenant_id, SUM(total_tokens) as daily_tokens
FROM public.phase2_llm_usage
WHERE created_at >= NOW() - INTERVAL '24 HOURS'
  AND status = 'COMPLETED'
GROUP BY tenant_id;

-- Cấu hình RLS (Row Level Security) - Chỉ Service Role được truy cập (Tùy chọn)
ALTER TABLE public.phase2_llm_usage ENABLE ROW LEVEL SECURITY;
-- Mặc định block tất cả các quyền từ anon/authenticated, chỉ có postgres, service_role có quyền.

-- 1. Unique constraint for request_id to prevent duplicates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'phase2_llm_usage_request_id_key'
    ) THEN
        ALTER TABLE public.phase2_llm_usage 
        ADD CONSTRAINT phase2_llm_usage_request_id_key UNIQUE (request_id);
    END IF;
END $$;

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
