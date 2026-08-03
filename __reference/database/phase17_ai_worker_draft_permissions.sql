-- Grant necessary permissions to service_role to insert artifacts and artifact_versions
GRANT SELECT, INSERT, UPDATE ON pn_os_ai_department.artifacts TO service_role;
GRANT SELECT, INSERT, UPDATE ON pn_os_ai_department.artifact_versions TO service_role;
