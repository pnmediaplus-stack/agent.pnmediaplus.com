-- Phase 14: SSOT Migration for Governance (Artifacts, QA, Approvals)

-- ==============================================================================
-- 1. Add organization_id to target tables
-- ==============================================================================

ALTER TABLE pn_os_ai_department.artifacts 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES portal_auth.organizations(id) ON DELETE CASCADE;

ALTER TABLE pn_os_ai_department.gates 
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES portal_auth.organizations(id) ON DELETE CASCADE;

-- ==============================================================================
-- 2. Backfill organization_id
-- ==============================================================================

-- Backfill artifacts from departments
UPDATE pn_os_ai_department.artifacts a
SET organization_id = d.organization_id
FROM pn_os_ai_department.departments d
WHERE a.department_id = d.id AND a.organization_id IS NULL;

-- Backfill gates from departments
UPDATE pn_os_ai_department.gates g
SET organization_id = d.organization_id
FROM pn_os_ai_department.departments d
WHERE g.owner_department_id = d.id AND g.organization_id IS NULL;

-- ==============================================================================
-- 3. Enforce NOT NULL
-- ==============================================================================

ALTER TABLE pn_os_ai_department.artifacts ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE pn_os_ai_department.gates ALTER COLUMN organization_id SET NOT NULL;

-- ==============================================================================
-- 4. Uniqueness Constraints (Re-scope to tenant)
-- ==============================================================================

-- artifacts.artifact_key
ALTER TABLE pn_os_ai_department.artifacts DROP CONSTRAINT IF EXISTS artifacts_artifact_key_key;
ALTER TABLE pn_os_ai_department.artifacts ADD CONSTRAINT artifacts_org_artifact_key_unique UNIQUE (organization_id, artifact_key);

-- gates.gate_key
ALTER TABLE pn_os_ai_department.gates DROP CONSTRAINT IF EXISTS gates_gate_key_key;
ALTER TABLE pn_os_ai_department.gates ADD CONSTRAINT gates_org_gate_key_unique UNIQUE (organization_id, gate_key);

-- ==============================================================================
-- 5. Row Level Security & Policies
-- ==============================================================================

ALTER TABLE pn_os_ai_department.artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pn_os_ai_department.artifact_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pn_os_ai_department.qa_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE pn_os_ai_department.gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pn_os_ai_department.approvals ENABLE ROW LEVEL SECURITY;

-- Create policies for tenant access
CREATE POLICY "tenant_read_artifacts" ON pn_os_ai_department.artifacts FOR SELECT TO authenticated 
USING (organization_id IN (SELECT organization_id FROM public.portal_organization_memberships WHERE user_id = auth.uid()));

CREATE POLICY "tenant_read_artifact_versions" ON pn_os_ai_department.artifact_versions FOR SELECT TO authenticated 
USING (artifact_id IN (
  SELECT id FROM pn_os_ai_department.artifacts 
  WHERE organization_id IN (SELECT organization_id FROM public.portal_organization_memberships WHERE user_id = auth.uid())
));

CREATE POLICY "tenant_read_qa_reviews" ON pn_os_ai_department.qa_reviews FOR SELECT TO authenticated 
USING (artifact_version_id IN (
  SELECT av.id FROM pn_os_ai_department.artifact_versions av
  JOIN pn_os_ai_department.artifacts a ON av.artifact_id = a.id
  WHERE a.organization_id IN (SELECT organization_id FROM public.portal_organization_memberships WHERE user_id = auth.uid())
));

CREATE POLICY "tenant_read_gates" ON pn_os_ai_department.gates FOR SELECT TO authenticated 
USING (organization_id IN (SELECT organization_id FROM public.portal_organization_memberships WHERE user_id = auth.uid()));

CREATE POLICY "tenant_read_approvals" ON pn_os_ai_department.approvals FOR SELECT TO authenticated 
USING (gate_id IN (
  SELECT id FROM pn_os_ai_department.gates 
  WHERE organization_id IN (SELECT organization_id FROM public.portal_organization_memberships WHERE user_id = auth.uid())
));

-- Service role bypasses
CREATE POLICY "service_role_all_artifacts" ON pn_os_ai_department.artifacts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_artifact_versions" ON pn_os_ai_department.artifact_versions FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_qa_reviews" ON pn_os_ai_department.qa_reviews FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_gates" ON pn_os_ai_department.gates FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_approvals" ON pn_os_ai_department.approvals FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ==============================================================================
-- 6. Explicit Grants for PostgREST
-- ==============================================================================

REVOKE ALL ON pn_os_ai_department.artifacts FROM authenticated;
REVOKE ALL ON pn_os_ai_department.artifact_versions FROM authenticated;
REVOKE ALL ON pn_os_ai_department.qa_reviews FROM authenticated;
REVOKE ALL ON pn_os_ai_department.gates FROM authenticated;
REVOKE ALL ON pn_os_ai_department.approvals FROM authenticated;

GRANT SELECT ON pn_os_ai_department.artifacts TO authenticated;
GRANT SELECT ON pn_os_ai_department.artifact_versions TO authenticated;
GRANT SELECT ON pn_os_ai_department.qa_reviews TO authenticated;
GRANT SELECT ON pn_os_ai_department.gates TO authenticated;
GRANT SELECT ON pn_os_ai_department.approvals TO authenticated;

GRANT ALL ON pn_os_ai_department.artifacts TO service_role;
GRANT ALL ON pn_os_ai_department.artifact_versions TO service_role;
GRANT ALL ON pn_os_ai_department.qa_reviews TO service_role;
GRANT ALL ON pn_os_ai_department.gates TO service_role;
GRANT ALL ON pn_os_ai_department.approvals TO service_role;
