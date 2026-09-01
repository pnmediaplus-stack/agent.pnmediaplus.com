-- Migration: 20260827000000_knowledge_namespace.sql
-- Description: Introduce 'namespace' to partition RAG documents (e.g. cskh vs marketing).

BEGIN;

-- 1. Add namespace to documents
ALTER TABLE public.crm_knowledge_documents 
ADD COLUMN IF NOT EXISTS namespace VARCHAR(50) NOT NULL DEFAULT 'cskh';

UPDATE public.crm_knowledge_documents SET namespace = 'cskh' WHERE namespace IS NULL;

-- 2. Update the trigger function to safely merge namespace into chunks metadata
CREATE OR REPLACE FUNCTION public.crm_knowledge_chunks_extract_metadata()
RETURNS TRIGGER AS $$
DECLARE
  v_channel_id UUID;
  v_namespace VARCHAR(50);
BEGIN
  -- 1. Lấy document_id và organization_id từ cột metadata do n8n truyền vào
  IF NEW.metadata IS NOT NULL THEN
    IF NEW.metadata->>'document_id' IS NOT NULL THEN
      NEW.document_id := (NEW.metadata->>'document_id')::UUID;
    END IF;
    IF NEW.metadata->>'organization_id' IS NOT NULL THEN
      NEW.organization_id := (NEW.metadata->>'organization_id')::UUID;
    END IF;
  END IF;

  -- 2. Xóa các trường n8n tự dính vào metadata để tiết kiệm dung lượng
  NEW.metadata := NEW.metadata - 'document_id' - 'organization_id';

  -- 3. Lấy channel_id và namespace từ document cha sau khi đã resolve document_id
  SELECT channel_id, namespace INTO v_channel_id, v_namespace
  FROM public.crm_knowledge_documents
  WHERE id = NEW.document_id;

  -- 3. Gộp thêm (merge) channel_id và namespace vào metadata một cách an toàn
  -- Toán tử || sẽ merge 2 jsonb, giữ nguyên các metadata cũ nếu có.
  NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb) 
               || jsonb_build_object('namespace', v_namespace);

  IF v_channel_id IS NOT NULL THEN
    NEW.metadata := NEW.metadata || jsonb_build_object('channel_id', v_channel_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Backfill existing chunks: merge {"namespace": "cskh"} into their metadata
UPDATE public.crm_knowledge_chunks AS c
SET metadata = COALESCE(c.metadata, '{}'::jsonb) || jsonb_build_object('namespace', d.namespace)
FROM public.crm_knowledge_documents AS d
WHERE c.document_id = d.id;

COMMIT;
