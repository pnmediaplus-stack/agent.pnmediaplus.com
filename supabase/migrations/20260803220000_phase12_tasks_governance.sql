-- Phase 12: Tasks Governance Multi-Tenant Retrofit

-- 1. Tasks Retrofit
ALTER TABLE pn_os_ai_department.tasks 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES portal_auth.organizations(id) ON DELETE CASCADE;

-- Backfill organization_id from the parent department
UPDATE pn_os_ai_department.tasks t
SET organization_id = d.organization_id
FROM pn_os_ai_department.departments d
WHERE t.department_id = d.id AND t.organization_id IS NULL;

-- Enforce NOT NULL (after backfill)
-- Note: If there are orphaned tasks without a department, this might fail, 
-- but in our system tasks must have a department_id due to NOT NULL constraint.
ALTER TABLE pn_os_ai_department.tasks ALTER COLUMN organization_id SET NOT NULL;

-- Re-scope uniqueness to be per-tenant
ALTER TABLE pn_os_ai_department.tasks DROP CONSTRAINT IF EXISTS tasks_task_key_key;
ALTER TABLE pn_os_ai_department.tasks ADD CONSTRAINT tasks_org_task_key_unique UNIQUE (organization_id, task_key);

-- 2. Row Level Security & Policies
ALTER TABLE pn_os_ai_department.tasks ENABLE ROW LEVEL SECURITY;

-- Allow tenants to read their own tasks
CREATE POLICY "tenant_read_tasks" ON pn_os_ai_department.tasks 
FOR SELECT TO authenticated 
USING (
  organization_id IN (
    SELECT organization_id FROM public.portal_organization_memberships
    WHERE user_id = auth.uid()
  )
);

-- Service role bypass for tasks
CREATE POLICY "service_role_all_tasks" ON pn_os_ai_department.tasks 
FOR ALL TO service_role 
USING (true) WITH CHECK (true);

-- 3. Explicit Grants for PostgREST
-- Revoke any previous overly-broad grants if any
REVOKE ALL ON pn_os_ai_department.tasks FROM authenticated;

-- Grant strictly SELECT to authenticated users (writes flow through Next.js API with service_role)
GRANT SELECT ON pn_os_ai_department.tasks TO authenticated;
GRANT ALL ON pn_os_ai_department.tasks TO service_role;
