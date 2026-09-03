-- Migration: 20260904000000_knowledge_architecture_v1_1.sql
-- Description: Implement PN Media Plus Knowledge System Architecture v1.1

BEGIN;

-- 1. Extend crm_knowledge_documents with v1.1 Architecture Columns
ALTER TABLE public.crm_knowledge_documents 
  ADD COLUMN IF NOT EXISTS knowledge_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS knowledge_status VARCHAR(20) DEFAULT 'DRAFT' CHECK (knowledge_status IN ('DRAFT', 'REVIEWED', 'APPROVED', 'ACTIVE', 'FAILED', 'SUPERSEDED', 'DEPRECATED', 'ARCHIVED')),
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS supersedes_id UUID REFERENCES public.crm_knowledge_documents(id) ON DELETE SET NULL;

-- 2. Enforce Idempotency at the Tenant Level
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_knowledge_idempotency 
  ON public.crm_knowledge_documents(organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 3. Enforce supersedes_id belongs to the same organization_id
CREATE OR REPLACE FUNCTION public.check_supersedes_tenant()
RETURNS TRIGGER AS $$
DECLARE
  v_super_org UUID;
BEGIN
  IF NEW.supersedes_id IS NOT NULL THEN
    SELECT organization_id INTO v_super_org FROM public.crm_knowledge_documents WHERE id = NEW.supersedes_id;
    IF v_super_org != NEW.organization_id THEN
      RAISE EXCEPTION 'TENANT_ISOLATION_VIOLATION: supersedes_id must belong to the same organization_id';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_supersedes_tenant ON public.crm_knowledge_documents;
CREATE TRIGGER trg_check_supersedes_tenant
  BEFORE INSERT OR UPDATE ON public.crm_knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION public.check_supersedes_tenant();

-- 4. Backfill Legacy Data
UPDATE public.crm_knowledge_documents 
SET 
  knowledge_status = CASE 
    WHEN status = 'ready' THEN 'ACTIVE'
    WHEN status = 'failed' THEN 'FAILED'
    ELSE 'DRAFT'
  END,
  knowledge_metadata = jsonb_build_object(
    'identity', jsonb_build_object('title', title),
    'evidence', jsonb_build_object('epistemic_status', 'unverified'),
    'usage', jsonb_build_object('allowed_purposes', '["customer_response"]'),
    'provenance', jsonb_build_object('source_reference', 'legacy_migration_v1.0'),
    'scope', jsonb_build_object('destination_namespaces', jsonb_build_array(COALESCE(namespace, 'cskh')))
  )
WHERE knowledge_metadata = '{}'::jsonb;

-- 5. Harden Vector Search RPC (match_documents)
-- N8N LangChain node strictly calls this with (vector, int, jsonb).
-- We MUST extract organization_id from the JSON filter OR explicitly require it as a parameter if using custom Postgres queries.
DROP FUNCTION IF EXISTS public.match_documents(vector, int, jsonb);

CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector,
  match_count int DEFAULT null,
  filter jsonb DEFAULT '{}',
  p_organization_id uuid DEFAULT null
) RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
#variable_conflict use_column
DECLARE
  v_org_id UUID;
BEGIN
  -- Extract organization_id either from param (for strict internal API) or from LangChain filter (for N8N compat)
  v_org_id := COALESCE(p_organization_id, (filter->>'organization_id')::UUID);

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'TENANT_ISOLATION_VIOLATION: organization_id is strictly required.';
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.content,
    c.metadata,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.crm_knowledge_chunks c
  JOIN public.crm_knowledge_documents d ON c.document_id = d.id
  WHERE 
    c.organization_id = v_org_id -- Strict Tenant Isolation
    AND d.organization_id = v_org_id
    AND d.knowledge_status = 'ACTIVE' -- Only retrieve ACTIVE knowledge
    AND c.metadata @> filter -- Allow further Langchain metadata filtering (e.g. namespace)
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMIT;
