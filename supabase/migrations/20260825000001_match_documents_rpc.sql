-- Description: Phase 6 - Add match_documents RPC for LangChain Supabase Vector Store
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
AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  SELECT
    id,
    content,
    metadata,
    (embedding::text)::jsonb AS embedding,
    1 - (crm_knowledge_chunks.embedding <=> query_embedding) AS similarity
  FROM public.crm_knowledge_chunks
  WHERE metadata @> filter
  ORDER BY crm_knowledge_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
