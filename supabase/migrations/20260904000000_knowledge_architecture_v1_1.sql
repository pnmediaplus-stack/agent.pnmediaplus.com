-- Migration: 20260904000000_knowledge_architecture_v1_1.sql
-- Description: Implement PN Media Plus Knowledge System Architecture v1.1
-- Resolves: Taxonomy separation, Knowledge Lifecycle, Idempotency, and Tenant Isolation.

BEGIN;

-- 1. Extend crm_knowledge_documents with v1.1 Architecture Columns
ALTER TABLE public.crm_knowledge_documents 
  ADD COLUMN IF NOT EXISTS knowledge_metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS knowledge_status VARCHAR(20) DEFAULT 'DRAFT' CHECK (knowledge_status IN ('DRAFT', 'REVIEWED', 'APPROVED', 'ACTIVE', 'FAILED', 'SUPERSEDED', 'DEPRECATED', 'ARCHIVED')),
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS supersedes_id UUID;

-- 2. Enforce Idempotency at the Tenant Level
CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_knowledge_idempotency 
  ON public.crm_knowledge_documents(organization_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- 3. Enforce supersedes_id belongs to the same organization_id natively (Composite FK)
-- Step 3a: Target must have unique constraint for composite FK
ALTER TABLE public.crm_knowledge_documents DROP CONSTRAINT IF EXISTS uq_crm_knowledge_org_id;
ALTER TABLE public.crm_knowledge_documents ADD CONSTRAINT uq_crm_knowledge_org_id UNIQUE (organization_id, id);

-- Step 3b: Add composite foreign key
ALTER TABLE public.crm_knowledge_documents DROP CONSTRAINT IF EXISTS fk_crm_knowledge_supersedes;
ALTER TABLE public.crm_knowledge_documents
  ADD CONSTRAINT fk_crm_knowledge_supersedes
  FOREIGN KEY (organization_id, supersedes_id)
  REFERENCES public.crm_knowledge_documents(organization_id, id) ON DELETE SET NULL;

-- 4. Audit Table
CREATE TABLE IF NOT EXISTS public.crm_knowledge_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  document_id UUID NOT NULL REFERENCES public.crm_knowledge_documents(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL, -- e.g., 'CREATED', 'REVIEWED', 'APPROVED', 'INGESTION_CALLBACK', 'DEPRECATED'
  previous_state VARCHAR(20),
  new_state VARCHAR(20),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_knowledge_audit_doc ON public.crm_knowledge_audit_logs(document_id);

-- 5. State Machine Enforcement Trigger
CREATE OR REPLACE FUNCTION public.crm_knowledge_state_machine()
RETURNS TRIGGER AS $$
BEGIN
  -- Check valid transitions when knowledge_status changes
  IF OLD.knowledge_status IS DISTINCT FROM NEW.knowledge_status THEN
    -- Cannot bypass approval to become ACTIVE directly
    IF NEW.knowledge_status = 'ACTIVE' AND OLD.knowledge_status NOT IN ('APPROVED', 'PROCESSING', 'FAILED') THEN
      RAISE EXCEPTION 'STATE_MACHINE_VIOLATION: Cannot transition from % to ACTIVE', OLD.knowledge_status;
    END IF;
    -- Cannot approve something that hasn't been reviewed or drafted
    IF NEW.knowledge_status = 'APPROVED' AND OLD.knowledge_status NOT IN ('REVIEWED', 'DRAFT') THEN
      RAISE EXCEPTION 'STATE_MACHINE_VIOLATION: Cannot transition from % to APPROVED', OLD.knowledge_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_knowledge_state_machine ON public.crm_knowledge_documents;
CREATE TRIGGER trg_crm_knowledge_state_machine
  BEFORE UPDATE ON public.crm_knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION public.crm_knowledge_state_machine();

-- 6. Backfill Legacy Data (Safe Mode)
-- Legacy docs marked as REVIEWED (not ACTIVE) to require human manager approval.
-- Fixes JSONB array syntax and epistemic enum.
UPDATE public.crm_knowledge_documents 
SET 
  knowledge_status = CASE 
    WHEN status = 'ready' THEN 'REVIEWED'
    WHEN status = 'failed' THEN 'FAILED'
    ELSE 'DRAFT'
  END,
  knowledge_metadata = jsonb_build_object(
    'identity', jsonb_build_object('title', title),
    'evidence', jsonb_build_object('epistemic_status', 'unverified'),
    'usage', jsonb_build_object('allowed_purposes', jsonb_build_array('customer_response')),
    'provenance', jsonb_build_object('source_reference', 'legacy_migration_v1.0'),
    'scope', jsonb_build_object('destination_namespaces', jsonb_build_array(COALESCE(namespace, 'cskh')))
  )
WHERE knowledge_metadata = '{}'::jsonb;

-- 7. Harden Vector Search RPC (match_documents)
-- Keep exactly the same signature (vector, int, jsonb) so grants and N8N nodes do not break.
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector,
  match_count int DEFAULT null,
  filter jsonb DEFAULT '{}'
) RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  embedding jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
#variable_conflict use_column
DECLARE
  v_org_id UUID;
  v_clean_filter JSONB;
BEGIN
  -- 1. Strict Tenant Isolation: Extract from LangChain filter
  IF filter ? 'organization_id' THEN
    v_org_id := (filter->>'organization_id')::UUID;
  ELSE
    RAISE EXCEPTION 'TENANT_ISOLATION_VIOLATION: organization_id is strictly required in the filter.';
  END IF;

  -- 2. Clean the filter: Remove organization_id before @> operator
  -- Because our chunking trigger already strips organization_id from chunk metadata to save space.
  v_clean_filter := filter - 'organization_id';

  RETURN QUERY
  SELECT
    c.id,
    c.content,
    c.metadata,
    NULL::jsonb AS embedding, -- Mask raw vector to save bandwidth and improve security
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.crm_knowledge_chunks c
  JOIN public.crm_knowledge_documents d ON c.document_id = d.id
  WHERE 
    c.organization_id = v_org_id -- Strict Tenant Enforcement on chunks
    AND d.organization_id = v_org_id -- Strict Tenant Enforcement on docs
    AND d.knowledge_status = 'ACTIVE' -- Only retrieve ACTIVE knowledge
    AND c.metadata @> v_clean_filter -- Metadata matching (e.g., namespace)
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

COMMIT;
