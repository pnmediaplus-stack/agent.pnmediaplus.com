-- DDL cho bảng llm_ledger_outbox theo chuẩn Gatekeeper
CREATE TABLE IF NOT EXISTS public.llm_ledger_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  tenant_id text NOT NULL,
  usage_id uuid NOT NULL REFERENCES public.phase2_llm_usage(id) ON DELETE CASCADE,

  provider_code text NOT NULL,
  model_code text NOT NULL,
  task_id text,

  status text NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),

  estimated_cost numeric(10,6) NOT NULL DEFAULT 0,
  pricing_missing boolean NOT NULL DEFAULT false,
  pricing_missing_reason text,

  attempt_count integer NOT NULL DEFAULT 0,
  locked_at timestamptz,
  last_error text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,

  UNIQUE (usage_id)
);

CREATE INDEX IF NOT EXISTS idx_llm_ledger_outbox_status_created_at
  ON public.llm_ledger_outbox (status, created_at);

CREATE INDEX IF NOT EXISTS idx_llm_ledger_outbox_tenant_status
  ON public.llm_ledger_outbox (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_llm_ledger_outbox_task_id
  ON public.llm_ledger_outbox (task_id)
  WHERE task_id IS NOT NULL;
