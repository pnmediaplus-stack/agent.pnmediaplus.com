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
CREATE INDEX idx_llm_usage_actor_time ON public.phase2_llm_usage (actor_id, created_at);
CREATE INDEX idx_llm_usage_tenant_time ON public.phase2_llm_usage (tenant_id, created_at);

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
