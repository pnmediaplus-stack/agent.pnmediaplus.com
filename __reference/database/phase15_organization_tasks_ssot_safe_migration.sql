-- ==============================================================================
-- PHASE 15: SAFE MIGRATION - CREATE SSOT VIEWS FOR TASKS & ORGANIZATION
-- ==============================================================================

-- 1. Create Departments SSOT View
CREATE OR REPLACE VIEW public.phase1_departments_ssot AS
SELECT 
  id,
  canonical_name AS name,
  COALESCE(owner_external_ref, owner_actor_type::text) AS owner,
  description AS purpose,
  state::text AS state,
  0 AS "activeAgents", 
  0 AS "openTasks"
FROM pn_os_ai_department.departments;

-- 2. Create Agents SSOT View
CREATE OR REPLACE VIEW public.phase1_agents_ssot AS
SELECT 
  id,
  canonical_name AS name,
  department_id AS "departmentId",
  role_label AS role,
  operational_status::text AS status,
  state::text AS state,
  focus_label AS focus
FROM pn_os_ai_department.agents;

-- 3. Create Tasks SSOT View
CREATE OR REPLACE VIEW public.phase1_tasks_ssot AS
SELECT 
  id,
  title,
  department_id AS "departmentId",
  owner_agent_id AS "agentId",
  state::text AS status,
  intent_type AS "intentType",
  created_at AS "createdAt",
  updated_at AS "updatedAt",
  owner_label AS owner,
  CASE 
    WHEN priority < 40 THEN 'Low'
    WHEN priority >= 70 THEN 'High'
    ELSE 'Medium'
  END AS priority
FROM pn_os_ai_department.tasks;

-- 4. Create Gates SSOT View
CREATE OR REPLACE VIEW public.phase1_gates_ssot AS
SELECT 
  id,
  canonical_name AS name,
  state::text AS status,
  'System' AS owner,
  rule_summary AS rationale
FROM pn_os_ai_department.gates;

-- 5. Grant Permissions
GRANT SELECT ON public.phase1_departments_ssot TO anon, authenticated, service_role;
GRANT SELECT ON public.phase1_agents_ssot TO anon, authenticated, service_role;
GRANT SELECT ON public.phase1_tasks_ssot TO anon, authenticated, service_role;
GRANT SELECT ON public.phase1_gates_ssot TO anon, authenticated, service_role;
