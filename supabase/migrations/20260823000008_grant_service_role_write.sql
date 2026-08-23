-- Restore write permissions for the secure backend (service_role)
-- The server boundary is meant to block 'authenticated' and 'anon' (clients), 
-- but the backend API (service_role) MUST be able to write to these tables.

GRANT INSERT, UPDATE, DELETE ON public.phase2_content_items TO service_role;
GRANT INSERT, UPDATE, DELETE ON pn_content_phase2.content_items TO service_role;
