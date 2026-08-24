-- Fix 403 Forbidden on phase2_assets view after adding security_invoker
GRANT SELECT ON pn_content_phase2.assets TO service_role, authenticated;
GRANT SELECT ON public.phase2_assets TO service_role, authenticated;
