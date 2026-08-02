-- Fix Foreign Key violation when Create Workflow Run / Create Tasks try to insert with department_id

-- 1. Grant MINIMUM privileges to service_role (only SELECT is needed for read operations in API if any)
GRANT SELECT ON pn_os_ai_department.departments TO service_role;

-- 2. Seed the required department directly in SQL (runs as postgres/superuser, so it bypasses RLS/Permissions)
INSERT INTO pn_os_ai_department.departments (
    id, 
    department_key, 
    canonical_name, 
    owner_label, 
    purpose, 
    description, 
    state
) VALUES (
    '11111111-1111-1111-1111-111111111111', 
    'media_pipeline', 
    'Media Pipeline', 
    'system_orchestrator', 
    'Automated content factory for end-to-end viral video/post production, visual generation, and QA gating.', 
    'Department seeded for Phase 2/3 n8n AI Worker orchestrator', 
    'PARTIAL'
) ON CONFLICT (id) DO NOTHING;
