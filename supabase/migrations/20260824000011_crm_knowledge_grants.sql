-- Description: Grant proper permissions to API roles for Knowledge Base tables

-- Documents Table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_knowledge_documents TO service_role;

-- Chunks Table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_knowledge_chunks TO service_role;

-- Reload PostgREST schema cache just in case
NOTIFY pgrst, 'reload schema';
