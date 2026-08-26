-- Migration: 20260827000001_crm_knowledge_backfill_channel_metadata.sql
-- Description: Backfill channel_id into existing knowledge chunks metadata from their parent documents.
-- This closes the historical gap for rows created before the DB trigger injection was added.

BEGIN;

UPDATE public.crm_knowledge_chunks AS c
SET metadata = COALESCE(c.metadata, '{}'::jsonb) || jsonb_build_object('channel_id', d.channel_id)
FROM public.crm_knowledge_documents AS d
WHERE c.document_id = d.id
  AND d.channel_id IS NOT NULL
  AND (
    c.metadata IS NULL
    OR c.metadata->>'channel_id' IS DISTINCT FROM d.channel_id::text
  );

COMMIT;
