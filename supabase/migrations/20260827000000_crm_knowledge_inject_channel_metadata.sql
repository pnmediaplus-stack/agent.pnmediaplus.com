-- Migration: 20260827000000_crm_knowledge_inject_channel_metadata.sql
-- Description: Update trigger to automatically inject channel_id into vector chunk metadata based on the parent document

CREATE OR REPLACE FUNCTION public.crm_knowledge_chunks_extract_metadata()
RETURNS TRIGGER AS $$
DECLARE
  v_channel_id UUID;
BEGIN
  -- 1. Lấy document_id và organization_id từ cột metadata do n8n truyền vào
  IF NEW.metadata IS NOT NULL THEN
    IF NEW.metadata->>'document_id' IS NOT NULL THEN
      NEW.document_id := (NEW.metadata->>'document_id')::uuid;
    END IF;
    
    IF NEW.metadata->>'organization_id' IS NOT NULL THEN
      NEW.organization_id := (NEW.metadata->>'organization_id')::uuid;
    END IF;
  END IF;

  -- 2. Tự động bơm channel_id vào metadata từ bảng tài liệu gốc
  -- (Giải quyết triệt để vấn đề n8n workflow quên không truyền channel_id)
  IF NEW.document_id IS NOT NULL THEN
    SELECT channel_id INTO v_channel_id FROM public.crm_knowledge_documents WHERE id = NEW.document_id;
    IF v_channel_id IS NOT NULL THEN
      NEW.metadata := coalesce(NEW.metadata, '{}'::jsonb) || jsonb_build_object('channel_id', v_channel_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
