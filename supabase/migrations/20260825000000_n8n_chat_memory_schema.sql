-- ==============================================================================
-- PHASE 06: N8N Chat Memory Schema
-- Creates a dedicated table for n8n LangChain Postgres Chat Memory to store
-- conversation history independently from the CRM UI schema.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.n8n_chat_memory (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    message JSONB NOT NULL
);

-- Index for fast retrieval by session
CREATE INDEX IF NOT EXISTS idx_n8n_chat_memory_session_id ON public.n8n_chat_memory (session_id);

-- Enable RLS
ALTER TABLE public.n8n_chat_memory ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.n8n_chat_memory TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.n8n_chat_memory_id_seq TO service_role;

-- n8n connects using postgres/service_role depending on configuration, 
-- but it definitely requires full CRUD. We allow service_role to manage all records.
CREATE POLICY "service_role_all_n8n_chat_memory"
    ON public.n8n_chat_memory
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
