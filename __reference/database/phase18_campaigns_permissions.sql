-- Grant necessary permissions to service_role on the base campaigns table
-- This allows the n8n Campaign Planner to create new campaigns via /rest/v1/campaigns

GRANT ALL PRIVILEGES ON pn_content_phase2.campaigns TO service_role;
