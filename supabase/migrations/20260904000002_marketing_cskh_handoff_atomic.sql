-- Migration: 20260904000002_marketing_cskh_handoff_atomic.sql
-- Description: Marketing to CSKH Knowledge Handoff: Strict Metadata Validation Trigger & Atomic Superseding RPC
-- Target: DB Clone & Staging (Restricted to service_role and authenticated department owners)

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. TRIGGER FUNCTION: validate_crm_knowledge_metadata
-- Enforces strict metadata validation when transitioning to 'APPROVED'
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_crm_knowledge_metadata()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_meta JSONB;
  v_ts TIMESTAMPTZ;
  v_hash TEXT;
  v_version TEXT;
BEGIN
  -- We only enforce strict canonical validation when transitioning to or remaining in APPROVED state
  IF NEW.knowledge_status = 'APPROVED' THEN
    v_meta := NEW.knowledge_metadata;

    IF v_meta IS NULL OR jsonb_typeof(v_meta) <> 'object' THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: knowledge_metadata must be a non-null JSON object when APPROVED';
    END IF;

    -- 1. semantic_type enum validation
    IF NOT (v_meta ? 'semantic_type') OR v_meta->>'semantic_type' NOT IN (
      'fact', 'pattern', 'hypothesis', 'research_finding', 'learning', 'recommendation'
    ) THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: Invalid or missing semantic_type';
    END IF;

    -- 2. usage_authority enum validation
    IF NOT (v_meta ? 'usage_authority') OR v_meta->>'usage_authority' NOT IN (
      'internal_reasoning_only', 'cross_department', 'public_facing'
    ) THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: Invalid or missing usage_authority';
    END IF;

    -- 3. sensitivity enum validation
    IF NOT (v_meta ? 'sensitivity') OR v_meta->>'sensitivity' NOT IN (
      'public', 'internal', 'confidential', 'restricted'
    ) THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: Invalid or missing sensitivity';
    END IF;

    -- 4. allowed_purposes array validation
    IF NOT (v_meta ? 'allowed_purposes') OR jsonb_typeof(v_meta->'allowed_purposes') <> 'array' THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: allowed_purposes must be a JSON array';
    END IF;

    -- 5. Redaction Enforcement: If sensitivity is public and used for customer_response, redaction is mandatory
    IF v_meta->>'sensitivity' = 'public' AND v_meta->'allowed_purposes' ? 'customer_response' THEN
      IF NOT (v_meta ? 'redaction') OR jsonb_typeof(v_meta->'redaction') <> 'object' THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: redaction object is mandatory for public customer_response knowledge';
      END IF;

      v_hash := v_meta->'redaction'->>'redaction_hash';
      IF v_hash IS NULL OR v_hash !~ '^[0-9a-f]{64}$' THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: redaction_hash must be a 64-character lowercase hex string';
      END IF;

      v_version := v_meta->'redaction'->>'rules_version';
      IF v_version IS NULL OR length(trim(v_version)) = 0 THEN
        RAISE EXCEPTION 'VALIDATION_ERROR: rules_version is mandatory in redaction metadata';
      END IF;
    END IF;

    -- 6. Provenance Validation (Ensures approved_by matches auth.uid() and timestamp is valid)
    IF NOT (v_meta ? 'provenance') OR jsonb_typeof(v_meta->'provenance') <> 'object' THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: provenance object is mandatory for APPROVED knowledge';
    END IF;

    IF v_meta->'provenance'->>'approved_by' IS NULL 
       OR v_meta->'provenance'->>'approved_by' <> auth.uid()::text THEN
      RAISE EXCEPTION 'AUTHORIZATION_VIOLATION: provenance.approved_by must strictly match auth.uid()';
    END IF;

    IF v_meta->'provenance'->>'approved_at' IS NULL THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: provenance.approved_at cannot be null';
    END IF;

    BEGIN
      v_ts := (v_meta->'provenance'->>'approved_at')::TIMESTAMPTZ;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'VALIDATION_ERROR: provenance.approved_at must be a valid ISO8601 timestamp';
    END;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_crm_knowledge_metadata ON public.crm_knowledge_documents;
CREATE TRIGGER trg_validate_crm_knowledge_metadata
  BEFORE INSERT OR UPDATE ON public.crm_knowledge_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_crm_knowledge_metadata();

-- -----------------------------------------------------------------------------
-- 2. ENHANCED RPC: apply_knowledge_ingestion_callback with ATOMIC SUPERSEDING
-- Transitions new document APPROVED -> ACTIVE and atomically deprecates old document
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_knowledge_ingestion_callback(
  p_document_id UUID,
  p_organization_id UUID,
  p_status VARCHAR,
  p_correlation_id VARCHAR,
  p_payload_hash VARCHAR,
  p_ingestion_run_id UUID DEFAULT NULL,
  p_retry_attempt INT DEFAULT 0,
  p_error_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
#variable_conflict use_column
DECLARE
  v_caller_role TEXT;
  v_doc_k_status VARCHAR;
  v_doc_i_status VARCHAR;
  v_supersedes_id UUID;
  v_old_doc RECORD;
  v_existing_audit RECORD;
BEGIN
  -- GUARD 1: Caller must strictly be service_role
  v_caller_role := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    NULLIF(auth.role(), '')
  );
  IF v_caller_role <> 'service_role' THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: Only service_role can call apply_knowledge_ingestion_callback';
  END IF;

  -- GUARD 2: Mandatory Parameters
  IF p_document_id IS NULL OR p_organization_id IS NULL OR p_status IS NULL OR p_correlation_id IS NULL OR p_payload_hash IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'BAD_REQUEST',
      'message', 'Missing mandatory parameters (document_id, organization_id, status, correlation_id, payload_hash)'
    );
  END IF;

  IF p_status NOT IN ('SUCCESS', 'FAILED') THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'BAD_REQUEST',
      'message', 'Status must be SUCCESS or FAILED'
    );
  END IF;

  -- GUARD 3: Atomic Row Lock on Target Document
  SELECT knowledge_status, ingestion_status, supersedes_id
  INTO v_doc_k_status, v_doc_i_status, v_supersedes_id
  FROM public.crm_knowledge_documents
  WHERE id = p_document_id AND organization_id = p_organization_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'NOT_FOUND',
      'message', 'Document not found or tenant mismatch'
    );
  END IF;

  -- GUARD 4: Idempotency Conflict vs Idempotent Retry via correlation_id & payload_hash
  SELECT document_id, organization_id, action, payload_hash
  INTO v_existing_audit
  FROM public.crm_knowledge_audit_logs
  WHERE correlation_id = p_correlation_id
  LIMIT 1;

  IF FOUND THEN
    IF v_existing_audit.payload_hash <> p_payload_hash THEN
      RETURN jsonb_build_object(
        'success', false,
        'status', 'SEMANTIC_CONFLICT',
        'code', 409,
        'message', 'Correlation ID exists with differing payload_hash. Semantic conflict detected.'
      );
    ELSE
      -- Identical idempotent retry: return success without duplicate processing
      RETURN jsonb_build_object(
        'success', true,
        'status', 'IDEMPOTENT_REPLAY',
        'document_id', p_document_id,
        'knowledge_status', v_doc_k_status,
        'ingestion_status', v_doc_i_status
      );
    END IF;
  END IF;

  -- GUARD 5: Atomic Superseding Validation (If document replaces an older document)
  IF v_supersedes_id IS NOT NULL THEN
    IF v_supersedes_id = p_document_id THEN
      RAISE EXCEPTION 'SUPERSEDING_VIOLATION: Document cannot supersede itself';
    END IF;

    SELECT id, organization_id, knowledge_status
    INTO v_old_doc
    FROM public.crm_knowledge_documents
    WHERE id = v_supersedes_id AND organization_id = p_organization_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'SUPERSEDING_VIOLATION: Superseded document (%) does not exist or tenant mismatch', v_supersedes_id;
    END IF;

    IF v_old_doc.organization_id <> p_organization_id THEN
      RAISE EXCEPTION 'SUPERSEDING_VIOLATION: Cross-tenant superseding is strictly prohibited';
    END IF;
  END IF;

  -- Set transaction context GUCs for audit log trigger
  PERFORM set_config('app.correlation_id', p_correlation_id, true);
  PERFORM set_config('app.payload_hash', p_payload_hash, true);
  PERFORM set_config('app.verified_webhook_callback', 'true', true);
  IF p_ingestion_run_id IS NOT NULL THEN
    PERFORM set_config('app.ingestion_run_id', p_ingestion_run_id::text, true);
  END IF;
  PERFORM set_config('app.retry_attempt', p_retry_attempt::text, true);

  -- State Transition Logic
  IF p_status = 'SUCCESS' THEN
    -- Transition Target Document to ACTIVE
    UPDATE public.crm_knowledge_documents
    SET ingestion_status = 'SUCCESS',
        knowledge_status = 'ACTIVE',
        error_message = NULL,
        updated_at = clock_timestamp()
    WHERE id = p_document_id;

    -- ATOMIC SUPERSEDING: Transition superseded document to DEPRECATED in the SAME transaction
    IF v_supersedes_id IS NOT NULL AND v_old_doc.knowledge_status IN ('APPROVED', 'ACTIVE') THEN
      UPDATE public.crm_knowledge_documents
      SET knowledge_status = 'DEPRECATED',
          updated_at = clock_timestamp()
      WHERE id = v_supersedes_id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'status', 'ACTIVE',
      'document_id', p_document_id,
      'superseded_document_id', v_supersedes_id
    );
  ELSE
    -- On Ingestion Failure: Mark FAILED without activating
    UPDATE public.crm_knowledge_documents
    SET ingestion_status = 'FAILED',
        error_message = p_error_message,
        updated_at = clock_timestamp()
    WHERE id = p_document_id;

    RETURN jsonb_build_object(
      'success', false,
      'status', 'FAILED',
      'document_id', p_document_id,
      'error_message', p_error_message
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_knowledge_ingestion_callback(
  UUID, UUID, VARCHAR, VARCHAR, VARCHAR, UUID, INT, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.apply_knowledge_ingestion_callback(
  UUID, UUID, VARCHAR, VARCHAR, VARCHAR, UUID, INT, TEXT
) TO service_role;

COMMIT;
