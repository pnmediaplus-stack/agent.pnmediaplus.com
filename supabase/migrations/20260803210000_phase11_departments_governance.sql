-- Phase 11: Department & Agent Governance Multi-Tenant Retrofit

-- 1. Departments Retrofit
ALTER TABLE pn_os_ai_department.departments 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES portal_auth.organizations(id) ON DELETE CASCADE;

-- Backfill existing departments with the default organization (Single-tenant MVP fallback)
UPDATE pn_os_ai_department.departments 
SET organization_id = (SELECT id FROM portal_auth.organizations ORDER BY created_at ASC LIMIT 1) 
WHERE organization_id IS NULL;

-- Enforce NOT NULL
ALTER TABLE pn_os_ai_department.departments ALTER COLUMN organization_id SET NOT NULL;

-- Re-scope uniqueness to be per-tenant
ALTER TABLE pn_os_ai_department.departments DROP CONSTRAINT IF EXISTS departments_department_key_key;
ALTER TABLE pn_os_ai_department.departments ADD CONSTRAINT departments_org_dept_key_unique UNIQUE (organization_id, department_key);

-- 2. Agents Retrofit
ALTER TABLE pn_os_ai_department.agents 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES portal_auth.organizations(id) ON DELETE CASCADE;

UPDATE pn_os_ai_department.agents 
SET organization_id = (SELECT id FROM portal_auth.organizations ORDER BY created_at ASC LIMIT 1) 
WHERE organization_id IS NULL;

ALTER TABLE pn_os_ai_department.agents ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE pn_os_ai_department.agents DROP CONSTRAINT IF EXISTS agents_agent_key_key;
ALTER TABLE pn_os_ai_department.agents ADD CONSTRAINT agents_org_agent_key_unique UNIQUE (organization_id, agent_key);

-- 3. Row Level Security & Policies
ALTER TABLE pn_os_ai_department.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pn_os_ai_department.agents ENABLE ROW LEVEL SECURITY;

-- Allow tenants to read their own departments
CREATE POLICY "tenant_read_departments" ON pn_os_ai_department.departments 
FOR SELECT TO authenticated 
USING (
  organization_id IN (
    SELECT organization_id FROM public.portal_organization_memberships
    WHERE user_id = auth.uid()
  )
);

-- Service role bypass for departments
CREATE POLICY "service_role_all_departments" ON pn_os_ai_department.departments 
FOR ALL TO service_role 
USING (true) WITH CHECK (true);

-- Allow tenants to read their own agents
CREATE POLICY "tenant_read_agents" ON pn_os_ai_department.agents 
FOR SELECT TO authenticated 
USING (
  organization_id IN (
    SELECT organization_id FROM public.portal_organization_memberships
    WHERE user_id = auth.uid()
  )
);

-- Service role bypass for agents
CREATE POLICY "service_role_all_agents" ON pn_os_ai_department.agents 
FOR ALL TO service_role 
USING (true) WITH CHECK (true);

-- 4. Explicit Grants for PostgREST
-- Revoke any previous overly-broad grants if any
REVOKE ALL ON pn_os_ai_department.departments FROM authenticated;
REVOKE ALL ON pn_os_ai_department.agents FROM authenticated;

-- Grant strictly SELECT to authenticated users (writes flow through Next.js API with service_role)
GRANT SELECT ON pn_os_ai_department.departments TO authenticated;
GRANT ALL ON pn_os_ai_department.departments TO service_role;

GRANT SELECT ON pn_os_ai_department.agents TO authenticated;
GRANT ALL ON pn_os_ai_department.agents TO service_role;
