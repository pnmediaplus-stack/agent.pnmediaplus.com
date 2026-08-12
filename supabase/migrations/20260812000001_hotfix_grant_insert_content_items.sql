-- Hotfix: Restore INSERT/UPDATE/DELETE privileges for service_role on phase2_content_items
-- Migration 20260807000005 accidentally revoked these privileges, breaking N8N and Next.js APIs.

GRANT INSERT, UPDATE, DELETE ON public.phase2_content_items TO service_role;
GRANT INSERT, UPDATE, DELETE ON pn_content_phase2.content_items TO service_role;
