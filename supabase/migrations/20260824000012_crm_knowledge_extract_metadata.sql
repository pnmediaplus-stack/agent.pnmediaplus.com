-- Description: Trigger to extract document_id and organization_id from n8n vector store metadata

CREATE OR REPLACE FUNCTION public.crm_knowledge_chunks_extract_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Lấy document_id và organization_id từ cột metadata do n8n truyền vào
  IF NEW.metadata IS NOT NULL THEN
    IF NEW.metadata->>'document_id' IS NOT NULL THEN
      NEW.document_id := (NEW.metadata->>'document_id')::uuid;
    END IF;
    
    IF NEW.metadata->>'organization_id' IS NOT NULL THEN
      NEW.organization_id := (NEW.metadata->>'organization_id')::uuid;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_knowledge_chunks_extract_metadata ON public.crm_knowledge_chunks;
CREATE TRIGGER trg_crm_knowledge_chunks_extract_metadata
BEFORE INSERT ON public.crm_knowledge_chunks
FOR EACH ROW
EXECUTE FUNCTION public.crm_knowledge_chunks_extract_metadata();
