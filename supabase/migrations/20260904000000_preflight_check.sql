-- PREFLIGHT DRY-RUN SCRIPT v2.0
-- Chạy trong Supabase SQL Editor TRƯỚC khi apply migration.
-- Script READ-ONLY. Không thay đổi dữ liệu.
-- Kết quả phải được DBA ghi lại và ký tên trước khi Sign-off.

-- ===========================================================================
-- SECTION A: Extension & Schema State
-- ===========================================================================

-- A1. Vector extension
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector')
    THEN 'PASS: vector extension present'
    ELSE 'FAIL: vector extension missing'
  END AS a1_vector_extension;

-- A2. New columns existence on crm_knowledge_documents
SELECT
  col.colname,
  CASE WHEN c.column_name IS NOT NULL THEN 'EXISTS - check for conflict' ELSE 'MISSING - migration safe to add' END AS status
FROM (VALUES
  ('knowledge_status'), ('ingestion_status'), ('idempotency_key'),
  ('supersedes_id'), ('knowledge_metadata')
) AS col(colname)
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public'
  AND c.table_name  = 'crm_knowledge_documents'
  AND c.column_name = col.colname
ORDER BY col.colname;

-- A3. Audit table existence
SELECT
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'crm_knowledge_audit_logs'
  ) THEN 'EXISTS - run Section B' ELSE 'MISSING - Section B will be skipped safely' END AS a3_audit_table;

-- A4. Existing constraints that migration will drop+recreate
SELECT constraint_name, constraint_type, table_name
FROM information_schema.table_constraints
WHERE table_schema = 'public'
  AND table_name IN ('crm_knowledge_documents', 'crm_knowledge_audit_logs')
  AND constraint_name IN (
    'uq_crm_knowledge_org_id', 'fk_crm_knowledge_supersedes',
    'chk_audit_correlation', 'fk_audit_doc_org'
  )
ORDER BY table_name, constraint_name;

-- A5. Existing indexes
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('crm_knowledge_documents', 'crm_knowledge_audit_logs')
  AND indexname IN (
    'idx_crm_knowledge_idempotency', 'idx_crm_knowledge_audit_idemp',
    'idx_crm_knowledge_audit_doc'
  )
ORDER BY tablename, indexname;

-- A6. Existing triggers on target tables
SELECT trigger_name, event_manipulation, event_object_table, action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table IN ('crm_knowledge_documents', 'crm_knowledge_audit_logs')
ORDER BY event_object_table, trigger_name;

-- A7. Duplicate idempotency_key check — uses dynamic SQL to avoid parse error when column absent
DO $$
DECLARE v_count BIGINT; v_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='crm_knowledge_documents' AND column_name='idempotency_key'
  ) INTO v_exists;
  IF NOT v_exists THEN
    RAISE NOTICE 'A7 SKIP: idempotency_key column not yet present.'; RETURN;
  END IF;
  EXECUTE '
    SELECT COUNT(*) FROM (
      SELECT organization_id, idempotency_key
      FROM public.crm_knowledge_documents
      WHERE idempotency_key IS NOT NULL
      GROUP BY organization_id, idempotency_key
      HAVING COUNT(*) > 1
    ) dups' INTO v_count;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'A7 FAIL: % duplicate idempotency_key pairs found.', v_count;
  ELSE
    RAISE NOTICE 'A7 PASS: No duplicate idempotency_key.';
  END IF;
END $$;

-- A8. supersedes_id cross-tenant check — dynamic SQL to avoid parse error when column absent
DO $$
DECLARE v_count BIGINT; v_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='crm_knowledge_documents' AND column_name='supersedes_id'
  ) INTO v_exists;
  IF NOT v_exists THEN
    RAISE NOTICE 'A8 SKIP: supersedes_id column not yet present.'; RETURN;
  END IF;
  EXECUTE '
    SELECT COUNT(*)
    FROM public.crm_knowledge_documents d1
    JOIN public.crm_knowledge_documents d2 ON d1.supersedes_id = d2.id
    WHERE d1.organization_id != d2.organization_id' INTO v_count;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'A8 FAIL: % cross-tenant supersedes_id rows found.', v_count;
  ELSE
    RAISE NOTICE 'A8 PASS: No cross-tenant supersedes_id.';
  END IF;
END $$;

-- A9. match_documents function — signature, security, grantees
SELECT
  p.proname,
  pg_get_function_arguments(p.oid)  AS arguments,
  p.prosecdef                        AS security_definer,
  COALESCE(
    array_to_string(
      ARRAY(SELECT a.grantee::text FROM aclexplode(p.proacl) a),
      ', '
    ),
    'no explicit grants'
  ) AS grantees
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'match_documents';

-- ===========================================================================
-- SECTION B: Audit Data Anomalies (runs only if audit table exists)
-- Uses DO block + dynamic SQL to avoid hard error when table is absent.
-- ===========================================================================

DO $$
DECLARE
  tbl_exists BOOLEAN;
  orphan_rows BIGINT;
  missing_corr BIGINT;
  neg_retry BIGINT;
  tenant_mismatch BIGINT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'crm_knowledge_audit_logs'
  ) INTO tbl_exists;

  IF NOT tbl_exists THEN
    RAISE NOTICE 'B: SKIP — crm_knowledge_audit_logs does not exist. All B checks are PASS by default.';
    RETURN;
  END IF;

  -- B1: Orphan rows
  EXECUTE 'SELECT COUNT(*) FROM public.crm_knowledge_audit_logs WHERE document_id IS NULL OR organization_id IS NULL'
    INTO orphan_rows;
  IF orphan_rows > 0 THEN
    RAISE EXCEPTION 'B1 FAIL: % orphan audit rows found. Manual quarantine required.', orphan_rows;
  ELSE
    RAISE NOTICE 'B1 PASS: No orphan audit rows.';
  END IF;

  -- B2: Tenant mismatch
  EXECUTE '
    SELECT COUNT(*) FROM public.crm_knowledge_audit_logs a
    JOIN public.crm_knowledge_documents d ON a.document_id = d.id
    WHERE a.organization_id != d.organization_id'
    INTO tenant_mismatch;
  IF tenant_mismatch > 0 THEN
    RAISE EXCEPTION 'B2 FAIL: % audit rows with tenant mismatch.', tenant_mismatch;
  ELSE
    RAISE NOTICE 'B2 PASS: No tenant mismatch in audit logs.';
  END IF;

  -- B3: INGESTION rows missing correlation_id (would violate upcoming constraint)
  EXECUTE '
    SELECT COUNT(*) FROM public.crm_knowledge_audit_logs
    WHERE action LIKE ''INGESTION_%'' AND correlation_id IS NULL'
    INTO missing_corr;
  IF missing_corr > 0 THEN
    RAISE EXCEPTION 'B3 FAIL: % INGESTION audit rows missing correlation_id. Backfill before migration.', missing_corr;
  ELSE
    RAISE NOTICE 'B3 PASS: All INGESTION audit rows have correlation_id.';
  END IF;

  -- B4: Negative retry_attempt
  EXECUTE 'SELECT COUNT(*) FROM public.crm_knowledge_audit_logs WHERE retry_attempt < 0'
    INTO neg_retry;
  IF neg_retry > 0 THEN
    RAISE EXCEPTION 'B4 FAIL: % audit rows have negative retry_attempt.', neg_retry;
  ELSE
    RAISE NOTICE 'B4 PASS: No negative retry_attempt values.';
  END IF;

END $$;

-- ===========================================================================
-- SECTION C: Data Distribution (for backfill impact estimate)
-- ===========================================================================

-- C1. Current status distribution
SELECT status, COUNT(*) AS doc_count
FROM public.crm_knowledge_documents
GROUP BY status ORDER BY doc_count DESC;

-- C2. Records that WILL be backfilled by migration (dynamic SQL to prevent parse error before column exists)
DO $$
DECLARE
  v_col_exists BOOLEAN;
  v_will_backfill BIGINT;
  v_total BIGINT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='crm_knowledge_documents' AND column_name='knowledge_metadata'
  ) INTO v_col_exists;

  IF v_col_exists THEN
    EXECUTE 'SELECT COUNT(*) FILTER (WHERE knowledge_metadata IS NULL OR knowledge_metadata::text = ''{}''), COUNT(*) FROM public.crm_knowledge_documents'
      INTO v_will_backfill, v_total;
    RAISE NOTICE 'C2: % of % records will be backfilled by migration.', v_will_backfill, v_total;
  ELSE
    SELECT COUNT(*) INTO v_total FROM public.crm_knowledge_documents;
    RAISE NOTICE 'C2: Column knowledge_metadata does not exist yet. ALL % records will be backfilled upon migration.', v_total;
  END IF;
END $$;

-- ===========================================================================
-- SIGN-OFF BLOCK (DBA fills in after running)
-- ===========================================================================
-- A1 vector_extension   : _______________
-- A2 all 5 cols MISSING : _______________
-- A3 audit table        : _______________
-- A4 constraints        : _______________
-- A5 indexes            : _______________
-- A6 triggers           : _______________
-- A7 idempotency dups   : _______________
-- A8 supersedes tenant  : _______________
-- A9 RPC signature      : _______________
-- B  anomalies          : _______________
-- C1 doc counts         : _______________
-- C2 will_backfill      : _______________
--
-- DBA: ___________________   Date: ___________   DB: ___________________
