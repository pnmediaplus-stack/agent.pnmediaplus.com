-- Migration: 20260905000000_knowledge_qa_immutability.sql
-- Description: Enforce append-only immutability for QA inspection reports and create audit logging
-- Target: Authorized DB Clone & Staging (Restricted to service_role and verified session)

BEGIN;

-- 1. Trigger Function: prevent_qa_report_tampering
-- Protects knowledge_metadata->'qa_inspection_report' against any subsequent mutation or deletion
CREATE OR REPLACE FUNCTION public.prevent_qa_report_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  -- If document previously had a qa_inspection_report, it cannot be modified or removed
  IF OLD.knowledge_metadata ? 'qa_inspection_report' THEN
    IF (NEW.knowledge_metadata ? 'qa_inspection_report') IS FALSE OR
       (OLD.knowledge_metadata->'qa_inspection_report' IS DISTINCT FROM NEW.knowledge_metadata->'qa_inspection_report') THEN
      RAISE EXCEPTION 'IMMUTABILITY_VIOLATION: qa_inspection_report is append-only/immutable and cannot be modified or removed once recorded.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_qa_tampering ON public.crm_knowledge_documents;
CREATE TRIGGER trg_prevent_qa_tampering
  BEFORE UPDATE ON public.crm_knowledge_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_qa_report_tampering();

-- 2. Trigger Function: trg_crm_knowledge_qa_audit
-- Records QA inspection event into crm_knowledge_audit_logs whenever a QA report is attached
CREATE OR REPLACE FUNCTION public.trg_crm_knowledge_qa_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.knowledge_metadata ? 'qa_inspection_report') OR
     (TG_OP = 'UPDATE' AND (OLD.knowledge_metadata ? 'qa_inspection_report') IS FALSE AND NEW.knowledge_metadata ? 'qa_inspection_report') THEN
    INSERT INTO public.crm_knowledge_audit_logs (
      organization_id,
      document_id,
      actor_id,
      action,
      prev_knowledge_status,
      new_knowledge_status,
      prev_ingestion_status,
      new_ingestion_status,
      details
    ) VALUES (
      NEW.organization_id,
      NEW.id,
      COALESCE(auth.uid(), NEW.created_by),
      'QA_INSPECTION_RECORDED',
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.knowledge_status ELSE NULL END,
      NEW.knowledge_status,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.ingestion_status ELSE NULL END,
      NEW.ingestion_status,
      NEW.knowledge_metadata->'qa_inspection_report'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_knowledge_qa_audit ON public.crm_knowledge_documents;
CREATE TRIGGER trg_crm_knowledge_qa_audit
  AFTER INSERT OR UPDATE ON public.crm_knowledge_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_crm_knowledge_qa_audit();

-- 3. Dedicated Atomic RPC: record_knowledge_document_qa
-- Trusted backend RPC to record QA inspection atomically if not recorded on insert
CREATE OR REPLACE FUNCTION public.record_knowledge_document_qa(
  p_document_id UUID,
  p_organization_id UUID,
  p_qa_report JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_doc RECORD;
BEGIN
  -- Strict Tenant & Document existence check
  SELECT * INTO v_doc FROM public.crm_knowledge_documents
  WHERE id = p_document_id AND organization_id = p_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'DOCUMENT_NOT_FOUND: Document % in organization % does not exist.', p_document_id, p_organization_id;
  END IF;

  IF v_doc.knowledge_metadata ? 'qa_inspection_report' THEN
    RAISE EXCEPTION 'IMMUTABILITY_VIOLATION: Document already contains an immutable qa_inspection_report.';
  END IF;

  UPDATE public.crm_knowledge_documents
  SET knowledge_metadata = jsonb_set(
    COALESCE(knowledge_metadata, '{}'::jsonb),
    '{qa_inspection_report}',
    p_qa_report
  )
  WHERE id = p_document_id AND organization_id = p_organization_id;

  RETURN p_qa_report;
END;
$$;

-- Security Grants: Restricted to service_role
REVOKE ALL ON FUNCTION public.record_knowledge_document_qa(UUID, UUID, JSONB) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.record_knowledge_document_qa(UUID, UUID, JSONB) TO service_role;

COMMIT;
