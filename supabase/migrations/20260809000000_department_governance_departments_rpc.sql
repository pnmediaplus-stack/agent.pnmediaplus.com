-- Migration: Add department_governance_departments RPC
-- Purpose: Provide a lightweight, read-only endpoint for the frontend autocomplete to get accurate department IDs

CREATE OR REPLACE FUNCTION public.department_governance_departments()
RETURNS TABLE (
  department_id text,
  department_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, department_governance, pg_temp
AS $$
  SELECT
    e.department_id,
    e.department_name
  FROM department_governance.department_registry_entries e
  JOIN department_governance.department_registries r
    ON r.id = e.registry_id
  ORDER BY e.department_name;
$$;

-- Grant execute permissions
REVOKE ALL ON FUNCTION public.department_governance_departments() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.department_governance_departments() TO service_role;
