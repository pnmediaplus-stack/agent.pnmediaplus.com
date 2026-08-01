-- ==============================================================================
-- PHASE 14: MIGRATE ARTIFACTS AND WORKFLOW RUNS MOCK TABLES TO SSOT VIEWS
-- ==============================================================================

-- 1. Drop the mock tables (CASCADE is required because phase1_qa_reviews and phase1_approvals_data depend on them)
DROP TABLE IF EXISTS public.phase1_approvals_data CASCADE;
DROP TABLE IF EXISTS public.phase1_qa_reviews CASCADE;
DROP TABLE IF EXISTS public.phase1_workflow_runs CASCADE;
DROP TABLE IF EXISTS public.phase1_artifacts CASCADE;

-- 2. Create Views mapped to pn_os_ai_department.artifacts
CREATE VIEW public.phase1_artifacts AS
SELECT 
  id,
  canonical_name AS title,
  artifact_type AS type,
  department_id AS "departmentId",
  state::text AS state,
  updated_at AS "updatedAt",
  version_label AS version
FROM pn_os_ai_department.artifacts;

-- 3. Create Views mapped to pn_os_ai_department.workflow_runs
CREATE VIEW public.phase1_workflow_runs AS
SELECT 
  id,
  workflow_name AS name,
  workflow_key AS "workflowKey",
  run_status::text AS status,
  COALESCE(started_at, created_at) AS "startedAt",
  duration_label AS duration,
  target_label AS target
FROM pn_os_ai_department.workflow_runs;

-- 4. Create Views for QA Reviews (mapping to pn_os_ai_department.qa_reviews)
CREATE VIEW public.phase1_qa_reviews AS
SELECT
  qr.id,
  av.artifact_id AS "artifactId",
  COALESCE(qr.reviewer_external_ref, qr.reviewer_actor_type::text) AS reviewer,
  qr.verdict::text AS status,
  qr.notes,
  qr.created_at AS "reviewedAt"
FROM pn_os_ai_department.qa_reviews qr
JOIN pn_os_ai_department.artifact_versions av ON qr.artifact_version_id = av.id;

-- 5. Create Views for Approvals (mapping to pn_os_ai_department.approvals)
CREATE VIEW public.phase1_approvals AS
SELECT 
  id,
  lower(entity_type::text) AS "targetType",
  entity_id AS "targetId",
  approval_status::text AS status,
  COALESCE(requested_by_external_ref, requested_by_actor_type::text) AS "requestedBy",
  requested_at AS "requestedAt",
  COALESCE(approver_external_ref, approver_actor_type::text) AS "decidedBy"
FROM pn_os_ai_department.approvals;

-- 6. Apply RLS & Grant Permissions to the views
-- RLS cannot be applied directly to views in PostgreSQL (it uses the underlying table's RLS),
-- but we must grant the necessary roles access to select from these views.
GRANT SELECT ON public.phase1_artifacts TO anon, authenticated, service_role;
GRANT SELECT ON public.phase1_workflow_runs TO anon, authenticated, service_role;
GRANT SELECT ON public.phase1_qa_reviews TO anon, authenticated, service_role;
GRANT SELECT ON public.phase1_approvals TO anon, authenticated, service_role;
