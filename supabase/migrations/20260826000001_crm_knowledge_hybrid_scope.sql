-- Migration: 20260826000001_crm_knowledge_hybrid_scope.sql
-- Description: Add channel_id to crm_knowledge_documents and update match_documents RPC for hybrid scope RAG

BEGIN;

-- 1. Add channel_id to knowledge documents
ALTER TABLE public.crm_knowledge_documents 
ADD COLUMN IF NOT EXISTS channel_id UUID REFERENCES public.crm_channels(id) ON DELETE CASCADE;

-- 2. Update match_documents RPC to support OR logic for channel_id
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector,
  match_count int DEFAULT null,
  filter jsonb DEFAULT '{}'
) RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  embedding jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $ $
#variable_conflict use_column
DECLARE
  v_org_id text;
  v_channel_id text;
BEGIN
  -- Extract scope from the filter JSON
  v_org_id := filter->>'organization_id';
  v_channel_id := filter->>'channel_id';

  RETURN QUERY
  SELECT
    id,
    content,
    metadata,
    (embedding::text)::jsonb AS embedding,
    1 - (crm_knowledge_chunks.embedding <=> query_embedding) AS similarity
  FROM public.crm_knowledge_chunks
  WHERE 
    -- 1. STRICTLY MATCH organization_id to prevent cross-tenant data leaks
    (v_org_id IS NULL OR metadata->>'organization_id' = v_org_id)
    AND 
    -- 2. HYBRID SCOPE logic: Match if document is org_shared (channel_id is null) OR explicitly for this channel
    (v_channel_id IS NULL OR metadata->>'channel_id' IS NULL OR metadata->>'channel_id' = v_channel_id)
    AND
    -- 3. Maintain backward compatibility for any other generic JSONB filters requested by n8n
    (metadata @> (filter - 'channel_id' - 'organization_id'))
  ORDER BY crm_knowledge_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$ $;

COMMIT;
