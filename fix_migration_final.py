import os

sql = """BEGIN;

-- 1. Extend crm_knowledge_documents
ALTER TABLE public.crm_knowledge_documents 
  ADD COLUMN IF NOT EXISTS knowledge_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS knowledge_status VARCHAR(20) DEFAULT 'DRAFT' CHECK (knowledge_status IN ('DRAFT', 'REVIEWED', 'APPROVED', 'ACTIVE', 'SUPERSEDED', 'DEPRECATED', 'ARCHIVED')),
  ADD COLUMN IF NOT EXISTS ingestion_status VARCHAR(20) DEFAULT 'NOT_REQUIRED' CHECK (ingestion_status IN ('NOT_REQUIRED', 'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED')),
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS supersedes_id UUID;

-- 2. Idempotency & Tenant FK
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_knowledge_idempotency ON public.crm_knowledge_documents(organization_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
ALTER TABLE public.crm_knowledge_documents DROP CONSTRAINT IF EXISTS uq_crm_knowledge_org_id;
ALTER TABLE public.crm_knowledge_documents ADD CONSTRAINT uq_crm_knowledge_org_id UNIQUE (organization_id, id);
ALTER TABLE public.crm_knowledge_documents DROP CONSTRAINT IF EXISTS fk_crm_knowledge_supersedes;
ALTER TABLE public.crm_knowledge_documents ADD CONSTRAINT fk_crm_knowledge_supersedes FOREIGN KEY (organization_id, supersedes_id) REFERENCES public.crm_knowledge_documents(organization_id, id) ON DELETE RESTRICT;

-- 3. Audit Table (Append-Only)
CREATE TABLE IF NOT EXISTS public.crm_knowledge_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  document_id UUID NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  prev_knowledge_status VARCHAR(20),
  new_knowledge_status VARCHAR(20),
  prev_ingestion_status VARCHAR(20),
  new_ingestion_status VARCHAR(20),
  correlation_id VARCHAR(255),
  ingestion_run_id UUID,
  retry_attempt INT DEFAULT 0,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_audit_doc_org FOREIGN KEY (organization_id, document_id) REFERENCES public.crm_knowledge_documents(organization_id, id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_crm_knowledge_audit_doc ON public.crm_knowledge_audit_logs(document_id);

REVOKE UPDATE, DELETE ON public.crm_knowledge_audit_logs FROM PUBLIC, authenticated, service_role;
CREATE OR REPLACE FUNCTION public.prevent_audit_mutation() RETURNS TRIGGER AS $$
BEGIN RAISE EXCEPTION 'AUDIT_LOG_IMMUTABLE: Cannot update or delete audit logs.'; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_prevent_audit_mutation ON public.crm_knowledge_audit_logs;
CREATE TRIGGER trg_prevent_audit_mutation BEFORE UPDATE OR DELETE ON public.crm_knowledge_audit_logs FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();

-- 4. State Machine Trigger
CREATE OR REPLACE FUNCTION public.crm_knowledge_state_machine() RETURNS TRIGGER AS $$
DECLARE v_role VARCHAR;
BEGIN
  IF OLD.knowledge_status IS DISTINCT FROM NEW.knowledge_status THEN
    IF NEW.knowledge_status = 'REVIEWED' AND OLD.knowledge_status != 'DRAFT' THEN RAISE EXCEPTION 'Invalid transition to REVIEWED'; END IF;
    IF NEW.knowledge_status = 'APPROVED' THEN
      IF OLD.knowledge_status != 'REVIEWED' THEN RAISE EXCEPTION 'Invalid transition to APPROVED'; END IF;
      IF NEW.knowledge_metadata->'provenance'->>'approved_by' IS NULL OR NEW.knowledge_metadata->'provenance'->>'approved_by' != auth.uid()::text THEN RAISE EXCEPTION 'APPROVED requires approved_by matching auth.uid()'; END IF;
      IF NEW.knowledge_metadata->'provenance'->>'approved_at' IS NULL THEN RAISE EXCEPTION 'APPROVED requires approved_at'; END IF;
      SELECT role INTO v_role FROM public.portal_organization_memberships WHERE user_id = auth.uid() AND organization_id = NEW.organization_id;
      IF v_role NOT IN ('owner', 'admin', 'department_owner') THEN RAISE EXCEPTION 'Approver must be owner, admin, or department_owner'; END IF;
    END IF;
    IF NEW.knowledge_status = 'ACTIVE' THEN
      IF OLD.knowledge_status != 'APPROVED' THEN RAISE EXCEPTION 'ACTIVE must come from APPROVED'; END IF;
      IF NEW.ingestion_status != 'SUCCESS' THEN RAISE EXCEPTION 'ACTIVE requires ingestion SUCCESS'; END IF;
    END IF;
    IF NEW.knowledge_status IN ('SUPERSEDED', 'DEPRECATED') AND OLD.knowledge_status != 'ACTIVE' THEN RAISE EXCEPTION 'Can only deprecate/supersede ACTIVE'; END IF;
    IF NEW.knowledge_status = 'ARCHIVED' AND OLD.knowledge_status != 'DEPRECATED' THEN RAISE EXCEPTION 'ARCHIVED must come from DEPRECATED'; END IF;
  END IF;

  IF OLD.ingestion_status IS DISTINCT FROM NEW.ingestion_status THEN
    IF current_setting('request.jwt.claim.role', true) != 'service_role' THEN RAISE EXCEPTION 'Only service_role can update ingestion_status'; END IF;
    IF NEW.ingestion_status = 'SUCCESS' AND OLD.ingestion_status != 'PROCESSING' THEN RAISE EXCEPTION 'SUCCESS must come from PROCESSING'; END IF;
    IF NEW.ingestion_status = 'FAILED' AND OLD.ingestion_status != 'PROCESSING' THEN RAISE EXCEPTION 'FAILED must come from PROCESSING'; END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_crm_knowledge_state_machine ON public.crm_knowledge_documents;
CREATE TRIGGER trg_crm_knowledge_state_machine BEFORE UPDATE ON public.crm_knowledge_documents FOR EACH ROW EXECUTE FUNCTION public.crm_knowledge_state_machine();

-- 5. Audit Trigger
CREATE OR REPLACE FUNCTION public.trg_crm_knowledge_audit_log() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  IF OLD.knowledge_status IS DISTINCT FROM NEW.knowledge_status OR OLD.ingestion_status IS DISTINCT FROM NEW.ingestion_status THEN
    INSERT INTO public.crm_knowledge_audit_logs (
      organization_id, document_id, actor_id, action, prev_knowledge_status, new_knowledge_status, prev_ingestion_status, new_ingestion_status, details
    ) VALUES (
      NEW.organization_id, NEW.id, auth.uid(), 'STATE_CHANGE', OLD.knowledge_status, NEW.knowledge_status, OLD.ingestion_status, NEW.ingestion_status, NEW.knowledge_metadata
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_crm_knowledge_audit_insert ON public.crm_knowledge_documents;
CREATE TRIGGER trg_crm_knowledge_audit_insert AFTER UPDATE ON public.crm_knowledge_documents FOR EACH ROW EXECUTE FUNCTION public.trg_crm_knowledge_audit_log();

-- 6. Safe Backfill
UPDATE public.crm_knowledge_documents SET 
  knowledge_status = CASE WHEN status = 'ready' THEN 'REVIEWED' ELSE 'DRAFT' END,
  ingestion_status = 'NOT_REQUIRED',
  knowledge_metadata = jsonb_build_object('evidence', jsonb_build_object('epistemic_status', 'observed'))
WHERE knowledge_metadata IS NULL OR knowledge_metadata = '{}'::jsonb;

-- 7. RPC Contract
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector,
  match_count int DEFAULT null,
  filter jsonb DEFAULT '{}'
) RETURNS TABLE (
  id uuid, content text, metadata jsonb, embedding jsonb, similarity float
) LANGUAGE plpgsql SECURITY INVOKER AS $$
#variable_conflict use_column
DECLARE v_org_id UUID; v_clean_filter JSONB;
BEGIN
  IF filter ? 'organization_id' THEN v_org_id := (filter->>'organization_id')::UUID; ELSE RAISE EXCEPTION 'TENANT_ISOLATION_VIOLATION'; END IF;
  v_clean_filter := filter - 'organization_id';
  RETURN QUERY SELECT c.id, c.content, c.metadata, NULL::jsonb, 1 - (c.embedding <=> query_embedding)
  FROM public.crm_knowledge_chunks c JOIN public.crm_knowledge_documents d ON c.document_id = d.id
  WHERE c.organization_id = v_org_id AND d.organization_id = v_org_id AND d.knowledge_status = 'ACTIVE' AND d.ingestion_status = 'SUCCESS' AND c.metadata @> v_clean_filter
  ORDER BY c.embedding <=> query_embedding LIMIT match_count;
END;
$$;
COMMIT;
"""
with open("D:/Projects/agent.pnmediaplus.com/supabase/migrations/20260904000000_knowledge_architecture_v1_1.sql", "w", encoding="utf-8") as f:
    f.write(sql)
print("Migration updated successfully")
