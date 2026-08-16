-- 1. Add fields to phase2_llm_usage
ALTER TABLE public.phase2_llm_usage 
ADD COLUMN IF NOT EXISTS pricing_missing boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pricing_missing_reason text;

-- 2. Add fields to ai_token_ledger
ALTER TABLE public.ai_token_ledger 
ADD COLUMN IF NOT EXISTS pricing_missing boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS pricing_missing_reason text;

-- 3. Update the RPC finalize_llm_usage to accept the new fields
CREATE OR REPLACE FUNCTION public.finalize_llm_usage(
  p_record_id uuid,
  p_status text,
  p_prompt_tokens integer,
  p_completion_tokens integer,
  p_total_tokens integer,
  p_estimated_cost numeric,
  p_pricing_missing boolean DEFAULT false,
  p_pricing_missing_reason text DEFAULT NULL
) RETURNS void AS $$
BEGIN
  UPDATE public.phase2_llm_usage
  SET 
    status = p_status,
    prompt_tokens = p_prompt_tokens,
    completion_tokens = p_completion_tokens,
    total_tokens = p_total_tokens,
    estimated_cost = p_estimated_cost,
    pricing_missing = p_pricing_missing,
    pricing_missing_reason = p_pricing_missing_reason,
    updated_at = NOW()
  WHERE id = p_record_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
