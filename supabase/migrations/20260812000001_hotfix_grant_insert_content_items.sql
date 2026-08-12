-- Hotfix: Restore INSERT/UPDATE/DELETE privileges for service_role on phase2_content_items
-- Migration 20260807000005 accidentally revoked these privileges, breaking N8N and Next.js APIs.

GRANT INSERT, UPDATE, DELETE ON public.phase2_content_items TO service_role;
GRANT INSERT, UPDATE, DELETE ON pn_content_phase2.content_items TO service_role;

-- Thêm explicit RLS policy cho service_role giống như các bảng khác
DROP POLICY IF EXISTS "service_role_all_content_items" ON pn_content_phase2.content_items;
CREATE POLICY "service_role_all_content_items" ON pn_content_phase2.content_items
FOR ALL TO service_role USING (true) WITH CHECK (true);
