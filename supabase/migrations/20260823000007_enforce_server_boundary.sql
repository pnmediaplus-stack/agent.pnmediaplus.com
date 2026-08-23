-- Restore strict server boundary for phase2_content_items view and table
-- This explicitly undoes the over-permissive GRANT INSERT that was introduced in 06

REVOKE INSERT, UPDATE, DELETE ON public.phase2_content_items FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON pn_content_phase2.content_items FROM authenticated;

-- And reset to exactly the previous strict boundary state
REVOKE ALL ON public.phase2_content_items FROM PUBLIC, anon, authenticated, service_role;
GRANT USAGE ON SCHEMA pn_content_phase2 TO authenticated, service_role;
GRANT SELECT ON public.phase2_content_items TO authenticated, service_role;
GRANT SELECT ON pn_content_phase2.content_items TO authenticated, service_role;
