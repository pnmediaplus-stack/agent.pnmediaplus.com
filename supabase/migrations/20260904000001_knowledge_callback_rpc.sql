-- Migration: 20260904000001_knowledge_callback_rpc.sql
-- Description: N8N Webhook Ingestion Callback RPC Helper with Replay & Idempotency Conflict Protection
-- Compliance: Append-only audit logs are strictly preserved. No cleanup backdoor.

BEGIN;

-- 1. Thêm cột payload_hash vào audit logs để lưu hash của canonical event payload
ALTER TABLE public.crm_knowledge_audit_logs
  ADD COLUMN IF NOT EXISTS payload_hash VARCHAR(64);

-- 2. Cập nhật trigger audit log để tự động ghi nhận app.payload_hash từ GUC
CREATE OR REPLACE FUNCTION public.trg_crm_knowledge_audit_log()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF OLD.knowledge_status IS DISTINCT FROM NEW.knowledge_status THEN
    INSERT INTO public.crm_knowledge_audit_logs (
      organization_id, document_id, actor_id, action, prev_knowledge_status, new_knowledge_status,
      details, correlation_id, ingestion_run_id, retry_attempt, payload_hash
    ) VALUES (
      NEW.organization_id, NEW.id, auth.uid(), 'KNOWLEDGE_' || NEW.knowledge_status, OLD.knowledge_status, NEW.knowledge_status,
      NEW.knowledge_metadata, 
      NULLIF(current_setting('app.correlation_id', true), ''), 
      NULLIF(current_setting('app.ingestion_run_id', true), '')::UUID, 
      NULLIF(current_setting('app.retry_attempt', true), '')::INT,
      NULLIF(current_setting('app.payload_hash', true), '')
    );
  END IF;

  IF OLD.ingestion_status IS DISTINCT FROM NEW.ingestion_status THEN
    INSERT INTO public.crm_knowledge_audit_logs (
      organization_id, document_id, actor_id, action, prev_ingestion_status, new_ingestion_status,
      details, correlation_id, ingestion_run_id, retry_attempt, payload_hash
    ) VALUES (
      NEW.organization_id, NEW.id, auth.uid(), 'INGESTION_' || NEW.ingestion_status, OLD.ingestion_status, NEW.ingestion_status,
      NEW.knowledge_metadata, 
      NULLIF(current_setting('app.correlation_id', true), ''), 
      NULLIF(current_setting('app.ingestion_run_id', true), '')::UUID, 
      NULLIF(current_setting('app.retry_attempt', true), '')::INT,
      NULLIF(current_setting('app.payload_hash', true), '')
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Tạo RPC apply_knowledge_ingestion_callback (SECURITY DEFINER, khóa chặt search_path)
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
  v_existing_audit RECORD;
  v_constraint_name TEXT;
BEGIN
  -- GUARD 1: Caller bắt buộc phải là service_role
  v_caller_role := COALESCE(
    NULLIF(current_setting('request.jwt.claim.role', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
    NULLIF(auth.role(), '')
  );
  IF v_caller_role <> 'service_role' THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: Only service_role can call apply_knowledge_ingestion_callback';
  END IF;

  -- GUARD 2: Tham số bắt buộc
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

  -- GUARD 3: Khóa dòng tài liệu để xử lý Atomic (chống race condition)
  SELECT knowledge_status, ingestion_status 
  INTO v_doc_k_status, v_doc_i_status
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

  -- GUARD 4: Kiểm tra Idempotency Conflict vs Idempotent Retry
  SELECT document_id, organization_id, action, payload_hash
  INTO v_existing_audit
  FROM public.crm_knowledge_audit_logs
  WHERE correlation_id = p_correlation_id
  LIMIT 1;

  IF FOUND THEN
    -- Nếu trùng correlation_id nhưng khác document_id hoặc khác organization_id hoặc khác payload_hash
    IF v_existing_audit.document_id <> p_document_id 
       OR v_existing_audit.organization_id <> p_organization_id 
       OR (v_existing_audit.payload_hash IS NOT NULL AND v_existing_audit.payload_hash <> p_payload_hash) THEN
      RETURN jsonb_build_object(
        'success', false,
        'status', 'IDEMPOTENCY_CONFLICT',
        'message', 'Correlation ID is already associated with a different document, tenant, or payload'
      );
    ELSE
      -- Trùng correlation_id và trùng 100% payload -> Idempotent Retry thành công
      RETURN jsonb_build_object(
        'success', true,
        'is_duplicate', true,
        'status', 'IDEMPOTENT_ACK',
        'message', 'Idempotent duplicate callback acknowledged safely',
        'document_id', p_document_id,
        'knowledge_status', v_doc_k_status,
        'ingestion_status', v_doc_i_status
      );
    END IF;
  END IF;

  -- 5. Thiết lập GUC nội bộ sau khi đã xác thực và vượt qua kiểm tra an toàn
  PERFORM set_config('app.verified_webhook_callback', 'true', true);
  PERFORM set_config('app.correlation_id', p_correlation_id, true);
  PERFORM set_config('app.payload_hash', p_payload_hash, true);
  IF p_ingestion_run_id IS NOT NULL THEN
    PERFORM set_config('app.ingestion_run_id', p_ingestion_run_id::text, true);
  END IF;
  PERFORM set_config('app.retry_attempt', p_retry_attempt::text, true);

  -- 6. Thực hiện chuyển trạng thái theo kết quả
  IF p_status = 'FAILED' THEN
    UPDATE public.crm_knowledge_documents
    SET ingestion_status = 'FAILED',
        error_message = p_error_message
    WHERE id = p_document_id AND organization_id = p_organization_id;
  ELSIF p_status = 'SUCCESS' THEN
    -- Cập nhật ingestion_status
    UPDATE public.crm_knowledge_documents
    SET ingestion_status = 'SUCCESS'
    WHERE id = p_document_id AND organization_id = p_organization_id;

    -- Nếu tài liệu đã được duyệt APPROVED thì chính thức kích hoạt ACTIVE
    IF v_doc_k_status = 'APPROVED' THEN
      UPDATE public.crm_knowledge_documents
      SET knowledge_status = 'ACTIVE'
      WHERE id = p_document_id AND organization_id = p_organization_id;
    END IF;
  END IF;

  -- Lấy lại trạng thái sau khi update
  SELECT knowledge_status, ingestion_status 
  INTO v_doc_k_status, v_doc_i_status
  FROM public.crm_knowledge_documents
  WHERE id = p_document_id AND organization_id = p_organization_id;

  RETURN jsonb_build_object(
    'success', true,
    'is_duplicate', false,
    'status', 'PROCESSED',
    'document_id', p_document_id,
    'knowledge_status', v_doc_k_status,
    'ingestion_status', v_doc_i_status
  );
EXCEPTION WHEN unique_violation THEN
  -- Chỉ bắt duy nhất lỗi unique constraint idx_crm_knowledge_audit_idemp cho retry trùng lặp
  GET STACKED DIAGNOSTICS v_constraint_name = CONSTRAINT_NAME;
  IF v_constraint_name = 'idx_crm_knowledge_audit_idemp' THEN
    RETURN jsonb_build_object(
      'success', true,
      'is_duplicate', true,
      'status', 'IDEMPOTENT_ACK',
      'message', 'Concurrent duplicate callback acknowledged safely',
      'document_id', p_document_id
    );
  ELSE
    RAISE;
  END IF;
END;
$$;

-- 4. Thu hồi quyền tuyệt đối khỏi client, chỉ cấp cho service_role
REVOKE ALL ON FUNCTION public.apply_knowledge_ingestion_callback(
  UUID, UUID, VARCHAR, VARCHAR, VARCHAR, UUID, INT, TEXT
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.apply_knowledge_ingestion_callback(
  UUID, UUID, VARCHAR, VARCHAR, VARCHAR, UUID, INT, TEXT
) TO service_role;

-- 5. Nâng cấp crm_knowledge_state_machine lên SECURITY DEFINER (Least Privilege: Không cần cấp quyền bảng membership cho authenticated)
CREATE OR REPLACE FUNCTION public.crm_knowledge_state_machine() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = pg_catalog, public 
AS $$
DECLARE v_role VARCHAR; v_ts TIMESTAMPTZ;
BEGIN
  -- Strict Allowlist for Knowledge Lifecycle
  IF OLD.knowledge_status IS DISTINCT FROM NEW.knowledge_status THEN
    IF NOT (
         (OLD.knowledge_status = 'DRAFT' AND NEW.knowledge_status = 'REVIEWED')
      OR (OLD.knowledge_status = 'REVIEWED' AND NEW.knowledge_status IN ('APPROVED', 'DRAFT'))
      OR (OLD.knowledge_status = 'APPROVED' AND NEW.knowledge_status = 'ACTIVE')
      OR (OLD.knowledge_status IN ('APPROVED', 'ACTIVE') AND NEW.knowledge_status IN ('SUPERSEDED', 'DEPRECATED'))
      OR (OLD.knowledge_status IN ('SUPERSEDED', 'DEPRECATED') AND NEW.knowledge_status = 'ARCHIVED')
    ) THEN
      RAISE EXCEPTION 'STATE_MACHINE_VIOLATION: Invalid transition % -> %', OLD.knowledge_status, NEW.knowledge_status;
    END IF;

    -- Approval Auth & Logic
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

      SELECT role INTO v_role FROM portal_auth.organization_memberships WHERE user_id = auth.uid() AND organization_id = NEW.organization_id;
      IF v_role NOT IN ('owner', 'admin', 'department_owner') THEN RAISE EXCEPTION 'AUTHORIZATION_VIOLATION: Approver must be owner/admin/department_owner'; END IF;
    END IF;

    -- Activation Gate (Requires verified API context flag AND service_role)
    IF NEW.knowledge_status = 'ACTIVE' THEN
      v_role := COALESCE(
        NULLIF(current_setting('request.jwt.claim.role', true), ''),
        (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'),
        NULLIF(auth.role(), '')
      );
      IF v_role <> 'service_role' 
         OR COALESCE(current_setting('app.verified_webhook_callback', true), 'false') <> 'true' THEN 
        RAISE EXCEPTION 'SECURITY_VIOLATION: Activation requires both service_role and verified webhook HMAC flag from API.'; 
      END IF;
      IF NEW.ingestion_status != 'SUCCESS' THEN RAISE EXCEPTION 'STATE_MACHINE_VIOLATION: ACTIVE requires ingestion SUCCESS'; END IF;
    END IF;
  END IF;

  -- Lock provenance after approval
  IF OLD.knowledge_status = 'APPROVED' AND NEW.knowledge_status != 'APPROVED' THEN
    IF OLD.knowledge_metadata->'provenance' IS DISTINCT FROM NEW.knowledge_metadata->'provenance' THEN
      RAISE EXCEPTION 'IMMUTABILITY_VIOLATION: Approved provenance cannot be modified';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 6. Helper Function SECURITY DEFINER chỉ trả về organization_id được phép của chính user (Tenant-Safe)
CREATE OR REPLACE FUNCTION public.get_auth_user_organizations()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT organization_id 
  FROM portal_auth.organization_memberships 
  WHERE user_id = auth.uid() 
    AND status = 'active';
$$;

REVOKE ALL ON FUNCTION public.get_auth_user_organizations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_auth_user_organizations() TO authenticated, service_role;

-- 7. Cập nhật RLS Policy trên crm_knowledge_documents dùng get_auth_user_organizations()
DROP POLICY IF EXISTS "Allow members to view their knowledge docs" ON public.crm_knowledge_documents;
CREATE POLICY "Allow members to view their knowledge docs" ON public.crm_knowledge_documents
FOR SELECT USING (
  organization_id IN (SELECT public.get_auth_user_organizations())
);

DROP POLICY IF EXISTS "Allow members to insert knowledge docs" ON public.crm_knowledge_documents;
CREATE POLICY "Allow members to insert knowledge docs" ON public.crm_knowledge_documents
FOR INSERT WITH CHECK (
  organization_id IN (SELECT public.get_auth_user_organizations())
);

DROP POLICY IF EXISTS "Allow members to update their knowledge docs" ON public.crm_knowledge_documents;
CREATE POLICY "Allow members to update their knowledge docs" ON public.crm_knowledge_documents
FOR UPDATE USING (
  organization_id IN (SELECT public.get_auth_user_organizations())
);

-- Cập nhật RLS Policy trên crm_knowledge_audit_logs
DROP POLICY IF EXISTS "Allow members to view audit logs" ON public.crm_knowledge_audit_logs;
CREATE POLICY "Allow members to view audit logs" ON public.crm_knowledge_audit_logs 
FOR SELECT USING ( 
  organization_id IN (SELECT public.get_auth_user_organizations()) 
);

-- Cập nhật RLS Policy trên crm_knowledge_chunks
DROP POLICY IF EXISTS "Allow members to view their knowledge chunks" ON public.crm_knowledge_chunks;
CREATE POLICY "Allow members to view their knowledge chunks" ON public.crm_knowledge_chunks 
FOR SELECT USING ( 
  organization_id IN (SELECT public.get_auth_user_organizations()) 
);

-- 8. Cấp quyền thao tác trên các bảng tri thức cho authenticated (được bảo vệ 100% bởi RLS helper phía trên)
GRANT SELECT, INSERT, UPDATE ON public.crm_knowledge_documents TO authenticated;
GRANT SELECT ON public.crm_knowledge_chunks TO authenticated;
GRANT SELECT ON public.crm_knowledge_audit_logs TO authenticated;

-- 9. Cấp quyền đọc 2 bảng tối thiểu cho duy nhất service_role (Tuyệt đối không cấp cho authenticated)
GRANT USAGE ON SCHEMA portal_auth TO service_role;
GRANT SELECT ON portal_auth.organizations TO service_role;
GRANT SELECT ON portal_auth.organization_memberships TO service_role;

COMMIT;
