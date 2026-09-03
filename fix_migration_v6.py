import os

sql = """BEGIN;

-- 1. Extend crm_knowledge_documents
ALTER TABLE public.crm_knowledge_documents 
  ADD COLUMN IF NOT EXISTS knowledge_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS knowledge_status VARCHAR(20) DEFAULT 'DRAFT' CHECK (knowledge_status IN ('DRAFT', 'REVIEWED', 'APPROVED', 'ACTIVE', 'SUPERSEDED', 'DEPRECATED', 'ARCHIVED')),
  ADD COLUMN IF NOT EXISTS ingestion_status VARCHAR(20) DEFAULT 'NOT_REQUIRED' CHECK (ingestion_status IN ('NOT_REQUIRED', 'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED')),
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS supersedes_id UUID;

-- 2. Safe Backfill (Accurate Ingestion Map, Executed BEFORE Triggers to prevent Rollback)
UPDATE public.crm_knowledge_documents SET 
  knowledge_status = CASE 
    WHEN status = 'ready' THEN 'REVIEWED' 
    WHEN status = 'processing' THEN 'DRAFT' 
    WHEN status = 'failed' THEN 'DRAFT'
    ELSE 'DRAFT' 
  END,
  ingestion_status = CASE
    WHEN status = 'ready' THEN 'SUCCESS'
    WHEN status = 'processing' THEN 'PROCESSING'
    WHEN status = 'failed' THEN 'FAILED'
    ELSE 'NOT_REQUIRED'
  END,
  knowledge_metadata = jsonb_build_object('evidence', jsonb_build_object('epistemic_status', 'observed'))
WHERE knowledge_metadata IS NULL OR knowledge_metadata = '{}'::jsonb;

-- 3. Idempotency & Tenant FK
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_knowledge_idempotency ON public.crm_knowledge_documents(organization_id, idempotency_key) WHERE idempotency_key IS NOT NULL;
ALTER TABLE public.crm_knowledge_documents DROP CONSTRAINT IF EXISTS uq_crm_knowledge_org_id;
ALTER TABLE public.crm_knowledge_documents ADD CONSTRAINT uq_crm_knowledge_org_id UNIQUE (organization_id, id);
ALTER TABLE public.crm_knowledge_documents DROP CONSTRAINT IF EXISTS fk_crm_knowledge_supersedes;
ALTER TABLE public.crm_knowledge_documents ADD CONSTRAINT fk_crm_knowledge_supersedes FOREIGN KEY (organization_id, supersedes_id) REFERENCES public.crm_knowledge_documents(organization_id, id) ON DELETE RESTRICT;

-- 4. Audit Table (Robust & Append-Only)
CREATE TABLE IF NOT EXISTS public.crm_knowledge_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  document_id UUID NOT NULL,
  actor_id UUID,
  action VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
  prev_knowledge_status VARCHAR(20),
  new_knowledge_status VARCHAR(20),
  prev_ingestion_status VARCHAR(20),
  new_ingestion_status VARCHAR(20),
  correlation_id VARCHAR(255),
  ingestion_run_id UUID,
  retry_attempt INT DEFAULT 0,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT fk_audit_doc_org FOREIGN KEY (organization_id, document_id) REFERENCES public.crm_knowledge_documents(organization_id, id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_crm_knowledge_audit_doc ON public.crm_knowledge_audit_logs(document_id);

-- Fixed Idempotency: Multiple transitions can share one correlation_id (e.g. APPROVED then ACTIVE in same flow)
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_knowledge_audit_idemp 
  ON public.crm_knowledge_audit_logs(document_id, new_knowledge_status, new_ingestion_status, correlation_id) 
  WHERE correlation_id IS NOT NULL;

-- Secure Audit Logs (Immutability & RLS)
REVOKE ALL ON public.crm_knowledge_audit_logs FROM PUBLIC, authenticated, anon;
GRANT SELECT, INSERT ON public.crm_knowledge_audit_logs TO service_role;
GRANT SELECT ON public.crm_knowledge_audit_logs TO authenticated;

ALTER TABLE public.crm_knowledge_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow members to view audit logs" ON public.crm_knowledge_audit_logs;
CREATE POLICY "Allow members to view audit logs" ON public.crm_knowledge_audit_logs FOR SELECT USING ( 
  organization_id IN (SELECT organization_id FROM public.portal_organization_memberships WHERE user_id = auth.uid()) 
);

CREATE OR REPLACE FUNCTION public.prevent_audit_mutation() RETURNS TRIGGER AS $$
BEGIN RAISE EXCEPTION 'AUDIT_LOG_IMMUTABLE: Cannot update, delete, or truncate audit logs.'; END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_prevent_audit_mutation ON public.crm_knowledge_audit_logs;
CREATE TRIGGER trg_prevent_audit_mutation BEFORE UPDATE OR DELETE ON public.crm_knowledge_audit_logs FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();
DROP TRIGGER IF EXISTS trg_prevent_audit_truncate ON public.crm_knowledge_audit_logs;
CREATE TRIGGER trg_prevent_audit_truncate BEFORE TRUNCATE ON public.crm_knowledge_audit_logs FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_audit_mutation();

-- 5. State Machine Trigger (Strict Allowlist & Immutability)
CREATE OR REPLACE FUNCTION public.crm_knowledge_state_machine() RETURNS TRIGGER AS $$
DECLARE v_role VARCHAR; v_ts TIMESTAMPTZ;
BEGIN
  -- Strict Allowlist for Knowledge Lifecycle
  IF OLD.knowledge_status IS DISTINCT FROM NEW.knowledge_status THEN
    IF NOT (
         (OLD.knowledge_status = 'DRAFT' AND NEW.knowledge_status = 'REVIEWED')
      OR (OLD.knowledge_status = 'REVIEWED' AND NEW.knowledge_status IN ('APPROVED', 'DRAFT'))
      OR (OLD.knowledge_status = 'APPROVED' AND NEW.knowledge_status = 'ACTIVE')
      OR (OLD.knowledge_status = 'ACTIVE' AND NEW.knowledge_status IN ('SUPERSEDED', 'DEPRECATED'))
      OR (OLD.knowledge_status IN ('SUPERSEDED', 'DEPRECATED') AND NEW.knowledge_status = 'ARCHIVED')
    ) THEN
      RAISE EXCEPTION 'STATE_MACHINE_VIOLATION: Invalid transition % -> %', OLD.knowledge_status, NEW.knowledge_status;
    END IF;

    -- Approval Auth & Logic (Strict NULL checks to prevent bypass)
    IF NEW.knowledge_status = 'APPROVED' THEN
      IF NEW.knowledge_metadata->'provenance'->>'approved_by' IS NULL 
         OR NEW.knowledge_metadata->'provenance'->>'approved_by' != auth.uid()::text THEN 
        RAISE EXCEPTION 'AUTHORIZATION_VIOLATION: approved_by must strictly match auth.uid()'; 
      END IF;
      
      IF NEW.knowledge_metadata->'provenance'->>'approved_at' IS NULL THEN 
        RAISE EXCEPTION 'VALIDATION_ERROR: approved_at cannot be null'; 
      END IF;

      BEGIN 
        v_ts := (NEW.knowledge_metadata->'provenance'->>'approved_at')::TIMESTAMPTZ; 
      EXCEPTION WHEN OTHERS THEN 
        RAISE EXCEPTION 'VALIDATION_ERROR: approved_at must be a valid ISO8601 timestamp'; 
      END;

      SELECT role INTO v_role FROM public.portal_organization_memberships WHERE user_id = auth.uid() AND organization_id = NEW.organization_id;
      IF v_role NOT IN ('owner', 'admin', 'department_owner') THEN RAISE EXCEPTION 'AUTHORIZATION_VIOLATION: Approver must be owner/admin/department_owner'; END IF;
    END IF;

    -- Activation Gate (Requires verified API context flag AND service_role)
    IF NEW.knowledge_status = 'ACTIVE' THEN
      IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' 
         OR COALESCE(current_setting('app.verified_webhook_callback', true), 'false') <> 'true' THEN 
        RAISE EXCEPTION 'SECURITY_VIOLATION: Activation requires both service_role and verified webhook HMAC flag from API.'; 
      END IF;
      IF NEW.ingestion_status != 'SUCCESS' THEN RAISE EXCEPTION 'STATE_MACHINE_VIOLATION: ACTIVE requires ingestion SUCCESS'; END IF;
    END IF;
  END IF;

  -- Lock provenance after approval
  IF OLD.knowledge_status IN ('APPROVED', 'ACTIVE', 'SUPERSEDED', 'DEPRECATED', 'ARCHIVED') THEN
    IF OLD.knowledge_metadata->'provenance' IS DISTINCT FROM NEW.knowledge_metadata->'provenance' THEN
      RAISE EXCEPTION 'IMMUTABILITY_VIOLATION: Cannot modify provenance after approval.';
    END IF;
  END IF;

  -- Strict Allowlist for Ingestion Lifecycle
  IF OLD.ingestion_status IS DISTINCT FROM NEW.ingestion_status THEN
    IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN 
      RAISE EXCEPTION 'SECURITY_VIOLATION: Only service_role can update ingestion_status'; 
    END IF;
    IF NEW.ingestion_status IN ('SUCCESS', 'FAILED') THEN
      IF COALESCE(current_setting('app.verified_webhook_callback', true), 'false') <> 'true' THEN 
        RAISE EXCEPTION 'SECURITY_VIOLATION: Ingestion completion requires verified HMAC context flag from API.'; 
      END IF;
    END IF;
    IF NOT (
         (OLD.ingestion_status IN ('NOT_REQUIRED', 'PENDING', 'FAILED') AND NEW.ingestion_status = 'PROCESSING')
      OR (OLD.ingestion_status = 'PROCESSING' AND NEW.ingestion_status IN ('SUCCESS', 'FAILED'))
    ) THEN
      RAISE EXCEPTION 'STATE_MACHINE_VIOLATION: Invalid ingestion transition % -> %', OLD.ingestion_status, NEW.ingestion_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_crm_knowledge_state_machine ON public.crm_knowledge_documents;
CREATE TRIGGER trg_crm_knowledge_state_machine BEFORE UPDATE ON public.crm_knowledge_documents FOR EACH ROW EXECUTE FUNCTION public.crm_knowledge_state_machine();

-- 6. Audit Trigger
CREATE OR REPLACE FUNCTION public.trg_crm_knowledge_audit_log() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF OLD.knowledge_status IS DISTINCT FROM NEW.knowledge_status OR OLD.ingestion_status IS DISTINCT FROM NEW.ingestion_status THEN
    INSERT INTO public.crm_knowledge_audit_logs (
      organization_id, document_id, actor_id, action, prev_knowledge_status, new_knowledge_status, prev_ingestion_status, new_ingestion_status, details, correlation_id, ingestion_run_id, retry_attempt
    ) VALUES (
      NEW.organization_id, NEW.id, auth.uid(), 'STATE_CHANGE', OLD.knowledge_status, NEW.knowledge_status, OLD.ingestion_status, NEW.ingestion_status, NEW.knowledge_metadata, 
      NULLIF(current_setting('app.correlation_id', true), ''), 
      NULLIF(current_setting('app.ingestion_run_id', true), '')::UUID, 
      NULLIF(current_setting('app.retry_attempt', true), '')::INT
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_crm_knowledge_audit_insert ON public.crm_knowledge_documents;
CREATE TRIGGER trg_crm_knowledge_audit_insert AFTER UPDATE ON public.crm_knowledge_documents FOR EACH ROW EXECUTE FUNCTION public.trg_crm_knowledge_audit_log();

-- 7. RPC Contract (Strict Tenant & Namespace Context)
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector,
  match_count int DEFAULT null,
  filter jsonb DEFAULT '{}'
) RETURNS TABLE (
  id uuid, content text, metadata jsonb, embedding jsonb, similarity float
) LANGUAGE plpgsql SECURITY INVOKER AS $$
#variable_conflict use_column
DECLARE v_org_id UUID; v_namespace VARCHAR; v_clean_filter JSONB;
BEGIN
  IF filter ? 'organization_id' THEN v_org_id := (filter->>'organization_id')::UUID; ELSE RAISE EXCEPTION 'TENANT_ISOLATION_VIOLATION'; END IF;
  IF filter ? 'namespace' THEN v_namespace := filter->>'namespace'; END IF;

  IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
    IF NOT EXISTS (SELECT 1 FROM public.portal_organization_memberships WHERE user_id = auth.uid() AND organization_id = v_org_id) THEN
      RAISE EXCEPTION 'TENANT_ISOLATION_VIOLATION';
    END IF;
  END IF;

  match_count := GREATEST(1, LEAST(COALESCE(match_count, 10), 100));
  v_clean_filter := filter - 'organization_id' - 'namespace';

  RETURN QUERY SELECT c.id, c.content, c.metadata, NULL::jsonb, 1 - (c.embedding <=> query_embedding)
  FROM public.crm_knowledge_chunks c JOIN public.crm_knowledge_documents d ON c.document_id = d.id
  WHERE c.organization_id = v_org_id 
    AND d.organization_id = v_org_id 
    AND d.knowledge_status = 'ACTIVE' 
    AND d.ingestion_status = 'SUCCESS'
    AND (v_namespace IS NULL OR d.namespace = v_namespace) 
    AND (v_clean_filter = '{}'::jsonb OR c.metadata @> v_clean_filter)
  ORDER BY c.embedding <=> query_embedding LIMIT match_count;
END;
$$;
COMMIT;
"""
with open("D:/Projects/agent.pnmediaplus.com/supabase/migrations/20260904000000_knowledge_architecture_v1_1.sql", "w", encoding="utf-8") as f:
    f.write(sql)
print("Migration updated successfully")
