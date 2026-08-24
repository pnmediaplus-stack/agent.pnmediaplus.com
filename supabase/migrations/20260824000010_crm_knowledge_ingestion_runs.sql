-- Description: Persist knowledge ingestion run context for fail-closed error handling

CREATE TABLE IF NOT EXISTS public.crm_knowledge_ingestion_runs (
  workflow_run_id TEXT PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.crm_knowledge_documents(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES portal_auth.organizations(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT,
  mime_type TEXT,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'failed')),
  last_error TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_knowledge_ingestion_runs_org_status
  ON public.crm_knowledge_ingestion_runs(organization_id, status);

CREATE INDEX IF NOT EXISTS idx_crm_knowledge_ingestion_runs_doc
  ON public.crm_knowledge_ingestion_runs(document_id);

CREATE OR REPLACE FUNCTION public.set_crm_knowledge_ingestion_runs_updated_at()
RETURNS TRIGGER AS $body
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$body LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_knowledge_ingestion_runs_updated_at ON public.crm_knowledge_ingestion_runs;
CREATE TRIGGER trg_crm_knowledge_ingestion_runs_updated_at
BEFORE UPDATE ON public.crm_knowledge_ingestion_runs
FOR EACH ROW
EXECUTE FUNCTION public.set_crm_knowledge_ingestion_runs_updated_at();

ALTER TABLE public.crm_knowledge_ingestion_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages knowledge ingestion runs" ON public.crm_knowledge_ingestion_runs;
CREATE POLICY "Service role manages knowledge ingestion runs"
ON public.crm_knowledge_ingestion_runs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

REVOKE ALL ON public.crm_knowledge_ingestion_runs FROM anon, authenticated, public;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_knowledge_ingestion_runs TO service_role;

NOTIFY pgrst, 'reload schema';
