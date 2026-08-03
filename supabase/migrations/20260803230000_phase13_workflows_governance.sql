-- Phase 13: Workflows Governance Multi-Tenant Retrofit

-- 1. Workflow Runs Retrofit
ALTER TABLE pn_os_ai_department.workflow_runs 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES portal_auth.organizations(id) ON DELETE CASCADE;

-- Backfill organization_id from the parent department
UPDATE pn_os_ai_department.workflow_runs w
SET organization_id = d.organization_id
FROM pn_os_ai_department.departments d
WHERE w.department_id = d.id AND w.organization_id IS NULL;

-- Enforce NOT NULL (after backfill)
ALTER TABLE pn_os_ai_department.workflow_runs ALTER COLUMN organization_id SET NOT NULL;

-- Re-scope uniqueness to be per-tenant
ALTER TABLE pn_os_ai_department.workflow_runs DROP CONSTRAINT IF EXISTS workflow_runs_workflow_key_key;
ALTER TABLE pn_os_ai_department.workflow_runs ADD CONSTRAINT workflow_runs_org_workflow_key_unique UNIQUE (organization_id, workflow_key);

-- 2. Row Level Security & Policies
ALTER TABLE pn_os_ai_department.workflow_runs ENABLE ROW LEVEL SECURITY;

-- Allow tenants to read their own workflow runs
CREATE POLICY "tenant_read_workflow_runs" ON pn_os_ai_department.workflow_runs 
FOR SELECT TO authenticated 
USING (
  organization_id IN (
    SELECT organization_id FROM public.portal_organization_memberships
    WHERE user_id = auth.uid()
  )
);

-- Service role bypass for workflow_runs
CREATE POLICY "service_role_all_workflow_runs" ON pn_os_ai_department.workflow_runs 
FOR ALL TO service_role 
USING (true) WITH CHECK (true);

-- 3. Explicit Grants for PostgREST
-- Revoke any previous overly-broad grants if any
REVOKE ALL ON pn_os_ai_department.workflow_runs FROM authenticated;

-- Grant strictly SELECT to authenticated users
GRANT SELECT ON pn_os_ai_department.workflow_runs TO authenticated;
GRANT ALL ON pn_os_ai_department.workflow_runs TO service_role;
