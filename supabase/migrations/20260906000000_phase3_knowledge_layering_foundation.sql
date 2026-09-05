-- Migration: 20260906000000_phase3_knowledge_layering_foundation.sql
-- Description: Phase 3 Foundation: Knowledge Layering, Replay-Protected Approval RPC, and Dual RAG Isolation
-- Security: Zero hardcoded secrets. Schema private strictly isolated. Metadata framework provenance enforced.
-- Target: Authorized DB Clone & Staging (Restricted to service_role and verified session)

BEGIN;

-- 1. Create secure private schema, nonce storage, and secret vault
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM public, anon, authenticated;

CREATE TABLE IF NOT EXISTS private.knowledge_approval_nonces (
  nonce TEXT PRIMARY KEY,
  organization_id UUID NOT NULL,
  used_by UUID NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
REVOKE ALL ON TABLE private.knowledge_approval_nonces FROM public, anon, authenticated;
GRANT SELECT, INSERT ON TABLE private.knowledge_approval_nonces TO service_role;

CREATE TABLE IF NOT EXISTS private.knowledge_auth_secrets (
  secret_key TEXT PRIMARY KEY,
  secret_val TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
REVOKE ALL ON TABLE private.knowledge_auth_secrets FROM public, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE private.knowledge_auth_secrets TO service_role;

-- 2. DB Trigger: enforce_framework_provenance (Tamper-Resistant Metadata)
-- Prohibits regular authenticated sessions from forging is_framework = true or document_type = DECISION_FRAMEWORK
CREATE OR REPLACE FUNCTION public.enforce_framework_provenance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_caller_role TEXT;
BEGIN
  v_caller_role := COALESCE(current_setting('request.jwt.claim.role', true), '');
  
  -- If payload attempts to assign framework metadata
  IF (NEW.knowledge_metadata->>'is_framework' = 'true' OR NEW.knowledge_metadata->>'document_type' = 'DECISION_FRAMEWORK') THEN
    -- Only service_role can authoritatively assign framework status
    IF v_caller_role <> 'service_role' THEN
      NEW.knowledge_metadata := jsonb_set(
        jsonb_set(NEW.knowledge_metadata, '{is_framework}', '"false"'),
        '{document_type}', '"OPERATIONAL_KNOWLEDGE"'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_framework_provenance ON public.crm_knowledge_documents;
CREATE TRIGGER trg_enforce_framework_provenance
  BEFORE INSERT OR UPDATE ON public.crm_knowledge_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_framework_provenance();

-- 3. RPC: approve_knowledge_package (Hardened with Nonce, HMAC, Exact Verification, and Row Locking)
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
  END IF;

  -- 3. Check replay window (+/- 5 minutes)
  IF p_timestamp < NOW() - INTERVAL '5 minutes' OR p_timestamp > NOW() + INTERVAL '5 minutes' THEN
    RAISE EXCEPTION 'TIMESTAMP_EXPIRED: Signature timestamp outside allowed 5-minute window.';
  END IF;

  -- 4. Verify Founder / Owner role in target organization
  SELECT role INTO v_member_role
  FROM public.portal_organization_memberships
  WHERE user_id = v_caller_id 
    AND organization_id = p_organization_id 
    AND status = 'active';

  IF v_member_role IS NULL OR v_member_role NOT IN ('owner', 'admin', 'department_owner') THEN
    RAISE EXCEPTION 'AUTHORIZATION_VIOLATION: Caller is not an active owner/admin/department_owner of organization %', p_organization_id;
  END IF;

  -- 5. Enforce Nonce Uniqueness (Replay Prevention)
  BEGIN
    INSERT INTO private.knowledge_approval_nonces (nonce, organization_id, used_by, used_at)
    VALUES (p_nonce, p_organization_id, v_caller_id, NOW());
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'NONCE_REPLAYED: The provided nonce % has already been used.', p_nonce;
  END;

  -- 6. Retrieve Secret from Private Vault (Fail-Closed: strictly zero hardcoded fallbacks)
  SELECT secret_val INTO v_secret 
  FROM private.knowledge_auth_secrets 
  WHERE secret_key = 'PACKAGE_APPROVAL_HMAC_SECRET';
  
  IF v_secret IS NULL OR LENGTH(TRIM(v_secret)) < 32 THEN
    RAISE EXCEPTION 'SECRET_CONFIG_MISSING: PACKAGE_APPROVAL_HMAC_SECRET must be configured in private vault with minimum 32 characters.';
  END IF;

  v_msg := p_organization_id::text || ':' || p_package_id || ':' || p_package_version || ':' || 
           p_expected_manifest_sha256 || ':' || p_expected_parts::text || ':' || 
           p_nonce || ':' || to_char(p_timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') || ':' || v_caller_id::text;

  v_expected_sig := encode(extensions.hmac(v_msg::bytea, v_secret::bytea, 'sha256'), 'hex');
  IF p_signature IS NULL OR LOWER(p_signature) <> LOWER(v_expected_sig) THEN
    RAISE EXCEPTION 'HMAC_SIGNATURE_INVALID: Cryptographic approval signature mismatch.';
  END IF;

  -- 7. Row-level Lock (FOR UPDATE) to prevent concurrency races
  PERFORM id 
  FROM public.crm_knowledge_documents
  WHERE organization_id = p_organization_id
    AND knowledge_metadata->>'package_id' = p_package_id
  FOR UPDATE;

  -- 8. Idempotency Check: Already fully approved with the same version & authority?
  SELECT COUNT(*) INTO v_already_approved
  FROM public.crm_knowledge_documents
  WHERE organization_id = p_organization_id
    AND knowledge_metadata->>'package_id' = p_package_id
    AND knowledge_status = 'APPROVED'
    AND knowledge_metadata->>'package_version' = p_package_version
    AND knowledge_metadata->'provenance'->>'approved_by' = v_caller_id::text;

  IF v_already_approved = p_expected_parts THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', 'PACKAGE_APPROVED',
      'idempotent', true,
      'approved_parts', v_already_approved,
      'package_id', p_package_id,
      'message', 'Package was already approved by this authority with the same version.'
    );
  END IF;

  -- 9. Strict Package Integrity Validation: Row count, Distinct KO count, Version, and Manifest
  SELECT 
    COUNT(*),
    COUNT(DISTINCT knowledge_metadata->>'ko_index')
  INTO v_total_rows, v_distinct_kos
  FROM public.crm_knowledge_documents
  WHERE organization_id = p_organization_id
    AND knowledge_metadata->>'package_id' = p_package_id
    AND knowledge_metadata->>'package_version' = p_package_version
    AND COALESCE(knowledge_metadata->>'is_framework', 'false') = 'true'
    AND knowledge_metadata->>'package_manifest_sha256' = p_expected_manifest_sha256;

  IF v_total_rows <> p_expected_parts THEN
    RAISE EXCEPTION 'PACKAGE_INTEGRITY_VIOLATION: Expected exactly % rows, but found % rows (duplicate parts or missing files).', p_expected_parts, v_total_rows;
  END IF;

  IF v_distinct_kos <> p_expected_parts THEN
    RAISE EXCEPTION 'PACKAGE_INTEGRITY_VIOLATION: Expected % distinct KO parts, but found %.', p_expected_parts, v_distinct_kos;
  END IF;

  -- 10. Check all ko_index values belong to canonical set
  SELECT COUNT(*) INTO v_invalid_kos
  FROM public.crm_knowledge_documents
  WHERE organization_id = p_organization_id
    AND knowledge_metadata->>'package_id' = p_package_id
    AND NOT ((knowledge_metadata->>'ko_index') = ANY(c_canonical_kos));

  IF v_invalid_kos > 0 THEN
    RAISE EXCEPTION 'PACKAGE_INTEGRITY_VIOLATION: Package contains unrecognized or malformed KO indices.';
  END IF;

  -- 11. Atomic State Transition to APPROVED + PENDING
  v_now_iso := to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"');

  UPDATE public.crm_knowledge_documents
  SET 
    knowledge_status = 'APPROVED',
    ingestion_status = 'PENDING',
    knowledge_metadata = jsonb_set(
      jsonb_set(
        jsonb_set(knowledge_metadata, '{package_status}', '"PACKAGE_APPROVED"'),
        '{provenance,approved_by}', to_jsonb(v_caller_id::text)
      ),
      '{provenance,approved_at}', to_jsonb(v_now_iso)
    ),
    updated_at = NOW()
  WHERE organization_id = p_organization_id
    AND knowledge_metadata->>'package_id' = p_package_id
    AND knowledge_metadata->>'package_version' = p_package_version;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'PACKAGE_APPROVED',
    'idempotent', false,
    'approved_parts', v_total_rows,
    'package_id', p_package_id,
    'approved_by', v_caller_id,
    'approved_at', v_now_iso
  );
END;
$$;

-- 4. Dedicated CSKH RAG RPC: match_cskh_knowledge (Fail-Closed, Zero Framework Leakage)
CREATE OR REPLACE FUNCTION public.match_cskh_knowledge(
  query_embedding vector,
  match_count int DEFAULT 5,
  p_channel_id UUID DEFAULT NULL,
  p_organization_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_id UUID;
  v_verified_org_id UUID;
BEGIN
  v_caller_role := COALESCE(current_setting('request.jwt.claim.role', true), '');

  IF v_caller_role = 'service_role' THEN
    IF p_organization_id IS NULL THEN
      RAISE EXCEPTION 'INVALID_ARGUMENT: p_organization_id required in service_role context.';
    END IF;
    v_verified_org_id := p_organization_id;
  ELSE
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
      RAISE EXCEPTION 'UNAUTHENTICATED: Valid user session required.';
    END IF;

    IF p_organization_id IS NOT NULL THEN
      SELECT organization_id INTO v_verified_org_id
      FROM public.portal_organization_memberships
      WHERE user_id = v_caller_id AND organization_id = p_organization_id AND status = 'active'
      LIMIT 1;
      
      IF v_verified_org_id IS NULL THEN
        RAISE EXCEPTION 'FORBIDDEN: Caller does not belong to specified organization.';
      END IF;
    ELSE
      SELECT organization_id INTO v_verified_org_id
      FROM public.portal_organization_memberships
      WHERE user_id = v_caller_id AND status = 'active'
      LIMIT 1;
      
      IF v_verified_org_id IS NULL THEN
        RAISE EXCEPTION 'FORBIDDEN: No active organization membership found.';
      END IF;
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.document_id,
    c.content,
    c.metadata,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.crm_knowledge_chunks c
  JOIN public.crm_knowledge_documents d ON c.document_id = d.id
  WHERE 
    -- 1. Strictly match verified tenant
    d.organization_id = v_verified_org_id
    AND
    -- 2. Must be ACTIVE and Ingestion SUCCESS
    d.knowledge_status = 'ACTIVE' 
    AND d.ingestion_status = 'SUCCESS'
    AND
    -- 3. ABSOLUTE EXCLUSION OF FRAMEWORK CHUNKS (Fail-closed text comparison, no ::boolean cast)
    COALESCE(d.knowledge_metadata->>'is_framework', 'false') <> 'true'
    AND COALESCE(d.knowledge_metadata->>'document_type', 'OPERATIONAL_KNOWLEDGE') = 'OPERATIONAL_KNOWLEDGE'
    AND
    -- 4. Channel isolation: specific channel or org-wide
    (
      CASE 
        WHEN p_channel_id IS NOT NULL THEN
          (d.channel_id = p_channel_id OR (d.channel_id IS NULL AND COALESCE((d.knowledge_metadata->>'is_org_wide'), 'false') = 'true'))
        ELSE
          (d.channel_id IS NULL AND COALESCE((d.knowledge_metadata->>'is_org_wide'), 'false') = 'true')
      END
    )
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. Dedicated Marketing Framework RAG RPC: match_marketing_framework (Requires Authorized Session & PACKAGE_ACTIVE)
CREATE OR REPLACE FUNCTION public.match_marketing_framework(
  query_embedding vector,
  match_count int DEFAULT 5,
  p_package_id TEXT DEFAULT 'PN_MARKETING_KO_SYSTEM_v1.0',
  p_organization_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
AS $$
DECLARE
  v_caller_role TEXT;
  v_caller_id UUID;
  v_verified_org_id UUID;
  v_member_role TEXT;
BEGIN
  v_caller_role := COALESCE(current_setting('request.jwt.claim.role', true), '');

  IF v_caller_role = 'service_role' THEN
    IF p_organization_id IS NULL THEN
      RAISE EXCEPTION 'INVALID_ARGUMENT: p_organization_id required in service_role context.';
    END IF;
    v_verified_org_id := p_organization_id;
  ELSE
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
      RAISE EXCEPTION 'UNAUTHENTICATED: Valid user session required.';
    END IF;

    IF p_organization_id IS NOT NULL THEN
      SELECT organization_id, role INTO v_verified_org_id, v_member_role
      FROM public.portal_organization_memberships
      WHERE user_id = v_caller_id AND organization_id = p_organization_id AND status = 'active'
      LIMIT 1;
    ELSE
      SELECT organization_id, role INTO v_verified_org_id, v_member_role
      FROM public.portal_organization_memberships
      WHERE user_id = v_caller_id AND status = 'active'
      LIMIT 1;
    END IF;

    IF v_verified_org_id IS NULL OR v_member_role NOT IN ('owner', 'admin', 'department_owner', 'marketing_agent') THEN
      RAISE EXCEPTION 'UNAUTHORIZED: Caller does not have authorized marketing agent rights.';
    END IF;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.document_id,
    c.content,
    c.metadata,
    1 - (c.embedding <=> query_embedding) AS similarity
  FROM public.crm_knowledge_chunks c
  JOIN public.crm_knowledge_documents d ON c.document_id = d.id
  WHERE 
    d.organization_id = v_verified_org_id
    AND d.knowledge_status = 'ACTIVE' 
    AND d.ingestion_status = 'SUCCESS'
    AND d.knowledge_metadata->>'package_status' = 'PACKAGE_ACTIVE'
    AND d.knowledge_metadata->>'package_id' = p_package_id
    AND d.knowledge_metadata->>'is_framework' = 'true'
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_knowledge_package TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_cskh_knowledge TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.match_marketing_framework TO authenticated, service_role;

COMMIT;
