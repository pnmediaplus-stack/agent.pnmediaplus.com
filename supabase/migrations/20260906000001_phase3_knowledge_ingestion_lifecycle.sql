-- Migration: 20260906000001_phase3_knowledge_ingestion_lifecycle.sql
-- Description: Phase 3 Knowledge Ingestion Lifecycle RPC and Package Approval Archived Guard
-- Security: Service-role only execution for ingestion starter, session-verified approval hardening.
-- Target: Authorized DB Clone & Staging (Restricted to service_role and verified session)

BEGIN;

-- 1. Ingestion Lifecycle Starter RPC (Transition PENDING -> PROCESSING with Correlation Context)
CREATE OR REPLACE FUNCTION public.start_knowledge_ingestion(
  p_organization_id UUID,
  p_document_id UUID,
  p_correlation_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_caller_role TEXT;
  v_corr_id TEXT;
  v_curr_status VARCHAR;
BEGIN
  v_caller_role := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    NULLIF(auth.role(), '')
  );

  IF v_caller_role NOT IN ('service_role', 'postgres') THEN
    RAISE EXCEPTION 'AUTHORIZATION_VIOLATION: Only service_role can start knowledge ingestion.';
  END IF;

  IF p_organization_id IS NULL OR p_document_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'BAD_REQUEST',
      'message', 'organization_id and document_id are required'
    );
  END IF;

  -- Lock document for update
  SELECT ingestion_status INTO v_curr_status
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

  IF v_curr_status NOT IN ('NOT_REQUIRED', 'PENDING', 'FAILED') THEN
    RETURN jsonb_build_object(
      'success', false,
      'status', 'INVALID_STATE_TRANSITION',
      'message', 'Document ingestion_status must be NOT_REQUIRED, PENDING, or FAILED to start processing'
    );
  END IF;

  v_corr_id := COALESCE(NULLIF(p_correlation_id, ''), 'ingest-start-' || gen_random_uuid()::text);

  -- Set correlation id for session so any audit triggers satisfy chk_audit_correlation
  PERFORM set_config('app.correlation_id', v_corr_id, true);

  UPDATE public.crm_knowledge_documents
  SET ingestion_status = 'PROCESSING',
      updated_at = NOW()
  WHERE id = p_document_id AND organization_id = p_organization_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'PROCESSING',
    'document_id', p_document_id,
    'correlation_id', v_corr_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.start_knowledge_ingestion(UUID, UUID, TEXT) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_knowledge_ingestion(UUID, UUID, TEXT) TO service_role;

-- 2. Update approve_knowledge_package to ignore ARCHIVED fixtures during package count validation
CREATE OR REPLACE FUNCTION public.approve_knowledge_package(
  p_organization_id UUID,
  p_package_id TEXT,
  p_package_version TEXT,
  p_expected_parts INT,
  p_expected_manifest_sha256 TEXT,
  p_nonce TEXT,
  p_timestamp TIMESTAMPTZ,
  p_signature TEXT,
  p_actor_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions, auth
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_id UUID;
  v_member_role TEXT;
  v_secret TEXT;
  v_msg TEXT;
  v_expected_sig TEXT;
  v_total_rows INT;
  v_distinct_kos INT;
  v_invalid_kos INT;
  v_already_approved INT;
  v_now_iso TEXT;
  v_transitioned_ids UUID[];
  c_canonical_kos CONSTANT TEXT[] := ARRAY[
    'KO-01', 'KO-02', 'KO-03', 'KO-04', 'KO-05',
    'KO-06', 'KO-07', 'KO-08', 'KO-09', 'KO-10'
  ];
BEGIN
  -- 1. Enforce bounds on expected parts (strictly 1 to 10)
  IF p_expected_parts < 1 OR p_expected_parts > 10 THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: p_expected_parts must be between 1 and 10.';
  END IF;

  -- 2. Determine caller identity and verify session / service_role context
  v_caller_role := COALESCE(current_setting('request.jwt.claim.role', true), '');
  
  IF v_caller_role = 'service_role' THEN
    IF p_actor_id IS NULL THEN
      RAISE EXCEPTION 'AUTHORIZATION_VIOLATION: p_actor_id required when executing in service_role context.';
    END IF;
    v_caller_id := p_actor_id;
  ELSE
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
      RAISE EXCEPTION 'UNAUTHENTICATED: Valid user session required.';
    END IF;
    IF p_actor_id IS NOT NULL AND p_actor_id <> v_caller_id THEN
      RAISE EXCEPTION 'AUTHORIZATION_VIOLATION: p_actor_id must match auth.uid().';
    END IF;
  END IF;

  -- 3. Verify caller membership role in organization
  SELECT role INTO v_member_role
  FROM public.portal_organization_memberships
  WHERE user_id = v_caller_id AND organization_id = p_organization_id AND status = 'active';

  IF v_member_role IS NULL OR v_member_role NOT IN ('owner', 'admin', 'department_owner') THEN
    RAISE EXCEPTION 'AUTHORIZATION_VIOLATION: Caller is not an authorized approver for this organization.';
  END IF;

  -- 4. Verify timestamp freshness (5 minutes anti-replay window)
  IF p_timestamp < NOW() - INTERVAL '5 minutes' OR p_timestamp > NOW() + INTERVAL '5 minutes' THEN
    RAISE EXCEPTION 'TIMESTAMP_EXPIRED: Timestamp outside allowed ±5 minute window.';
  END IF;

  -- 5. Fetch private HMAC signing secret from secure vault
  SELECT secret_val INTO v_secret
  FROM private.knowledge_auth_secrets
  WHERE secret_key = 'PACKAGE_APPROVAL_HMAC_SECRET';

  IF v_secret IS NULL OR length(v_secret) < 32 THEN
    RAISE EXCEPTION 'CONFIGURATION_ERROR: PACKAGE_APPROVAL_HMAC_SECRET not configured or insufficient entropy.';
  END IF;

  -- 6. Canonical Message Construction
  v_msg := p_organization_id::text || ':' ||
           p_package_id || ':' ||
           p_package_version || ':' ||
           p_expected_manifest_sha256 || ':' ||
           p_expected_parts::text || ':' ||
           p_nonce || ':' ||
           to_char(p_timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') || ':' ||
           v_caller_id::text;

  -- 7. Cryptographic HMAC Verification
  v_expected_sig := encode(extensions.hmac(v_msg::bytea, v_secret::bytea, 'sha256'), 'hex');

  IF lower(p_signature) <> lower(v_expected_sig) THEN
    RAISE EXCEPTION 'HMAC_SIGNATURE_INVALID: Cryptographic signature mismatch.';
  END IF;

  -- 8. Check and consume nonce atomically
  BEGIN
    INSERT INTO private.knowledge_approval_nonces (nonce, organization_id, used_by, used_at)
    VALUES (p_nonce, p_organization_id, v_caller_id, NOW());
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'NONCE_REPLAYED: Approval nonce has already been consumed.';
  END;

  -- 9. Check Idempotency: All active documents for this package already approved?
  SELECT COUNT(*) INTO v_already_approved
  FROM public.crm_knowledge_documents
  WHERE organization_id = p_organization_id
    AND knowledge_metadata->>'package_id' = p_package_id
    AND knowledge_metadata->>'package_version' = p_package_version
    AND knowledge_metadata->>'package_manifest_sha256' = p_expected_manifest_sha256
    AND knowledge_status = 'APPROVED'
    AND knowledge_status <> 'ARCHIVED';

  IF v_already_approved = p_expected_parts THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent', true,
      'status', 'PACKAGE_ALREADY_APPROVED',
      'package_id', p_package_id,
      'package_version', p_package_version,
      'approved_count', v_already_approved,
      'transitioned_now', false,
      'transitioned_doc_ids', '[]'::jsonb
    );
  END IF;

  -- 10. Strict Package Integrity Validation: Row count, Distinct KO count, Version, and Manifest (ignoring ARCHIVED)
  SELECT 
    COUNT(*),
    COUNT(DISTINCT knowledge_metadata->>'ko_index')
  INTO v_total_rows, v_distinct_kos
  FROM public.crm_knowledge_documents
  WHERE organization_id = p_organization_id
    AND knowledge_metadata->>'package_id' = p_package_id
    AND knowledge_metadata->>'package_version' = p_package_version
    AND COALESCE(knowledge_metadata->>'is_framework', 'false') = 'true'
    AND knowledge_metadata->>'package_manifest_sha256' = p_expected_manifest_sha256
    AND knowledge_status <> 'ARCHIVED';

  IF v_total_rows <> p_expected_parts THEN
    RAISE EXCEPTION 'PACKAGE_INTEGRITY_VIOLATION: Expected exactly % rows, but found % rows (duplicate parts or missing files).', p_expected_parts, v_total_rows;
  END IF;

  IF v_distinct_kos <> p_expected_parts THEN
    RAISE EXCEPTION 'PACKAGE_INTEGRITY_VIOLATION: Expected % distinct KO parts, but found %.', p_expected_parts, v_distinct_kos;
  END IF;

  -- 11. Check all ko_index values belong to canonical set (ignoring ARCHIVED)
  SELECT COUNT(*) INTO v_invalid_kos
  FROM public.crm_knowledge_documents
  WHERE organization_id = p_organization_id
    AND knowledge_metadata->>'package_id' = p_package_id
    AND knowledge_status <> 'ARCHIVED'
    AND NOT ((knowledge_metadata->>'ko_index') = ANY(c_canonical_kos));

  IF v_invalid_kos > 0 THEN
    RAISE EXCEPTION 'PACKAGE_INTEGRITY_VIOLATION: Package contains unrecognized or malformed KO indices.';
  END IF;

  -- 12. Atomic State Transition to APPROVED + PENDING
  v_now_iso := to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');
  PERFORM set_config('app.in_knowledge_package_approval', 'true', true);

  WITH updated AS (
    UPDATE public.crm_knowledge_documents
    SET 
      knowledge_status = 'APPROVED',
      ingestion_status = 'PENDING',
      knowledge_metadata = knowledge_metadata || jsonb_build_object(
        'package_status', 'PACKAGE_APPROVED',
        'provenance', COALESCE(knowledge_metadata->'provenance', '{}'::jsonb) || jsonb_build_object(
          'approved_by', v_caller_id::text,
          'approved_at', v_now_iso,
          'approver_role', v_member_role,
          'approval_nonce', p_nonce
        )
      ),
      updated_at = NOW()
    WHERE organization_id = p_organization_id
      AND knowledge_metadata->>'package_id' = p_package_id
      AND knowledge_metadata->>'package_version' = p_package_version
      AND knowledge_metadata->>'package_manifest_sha256' = p_expected_manifest_sha256
      AND knowledge_status IN ('DRAFT', 'REVIEWED')
    RETURNING id
  )
  SELECT array_agg(id) INTO v_transitioned_ids FROM updated;

  RETURN jsonb_build_object(
    'success', true,
    'idempotent', false,
    'status', 'PACKAGE_APPROVED',
    'package_id', p_package_id,
    'package_version', p_package_version,
    'approved_count', COALESCE(array_length(v_transitioned_ids, 1), 0),
    'approved_at', v_now_iso,
    'approver', v_caller_id,
    'transitioned_now', true,
    'transitioned_doc_ids', to_jsonb(COALESCE(v_transitioned_ids, ARRAY[]::uuid[]))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.approve_knowledge_package FROM public, anon;
GRANT EXECUTE ON FUNCTION public.approve_knowledge_package TO authenticated, service_role;

COMMIT;
