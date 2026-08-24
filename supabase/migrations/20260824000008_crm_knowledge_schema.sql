-- Description: Phase 5 - Knowledge Base & RAG Schema
-- Kích hoạt extension vector nếu chưa có
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

-- 1. Bảng quản lý metadata của tài liệu
CREATE TABLE IF NOT EXISTS public.crm_knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES portal_auth.organizations(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index hỗ trợ query danh sách tài liệu theo organization
CREATE INDEX IF NOT EXISTS idx_crm_knowledge_docs_org ON public.crm_knowledge_documents(organization_id, created_at DESC);

-- 2. Bảng lưu trữ Vector Chunks (Tương thích với n8n Postgres Vector Store Node)
CREATE TABLE IF NOT EXISTS public.crm_knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.crm_knowledge_documents(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES portal_auth.organizations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    metadata JSONB,
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index tối ưu hóa tìm kiếm Vector (Dùng HNSW cho tốc độ cực cao trên quy mô lớn)
CREATE INDEX IF NOT EXISTS idx_crm_knowledge_chunks_embedding ON public.crm_knowledge_chunks 
USING hnsw (embedding vector_cosine_ops);

-- Index lọc Chunk theo tổ chức và tài liệu
CREATE INDEX IF NOT EXISTS idx_crm_knowledge_chunks_org ON public.crm_knowledge_chunks(organization_id);
CREATE INDEX IF NOT EXISTS idx_crm_knowledge_chunks_doc ON public.crm_knowledge_chunks(document_id);

-- 3. Row Level Security (RLS)
ALTER TABLE public.crm_knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_knowledge_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow members to view their knowledge docs" ON public.crm_knowledge_documents;
CREATE POLICY "Allow members to view their knowledge docs" ON public.crm_knowledge_documents
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM public.portal_organization_memberships WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Allow members to insert knowledge docs" ON public.crm_knowledge_documents;
CREATE POLICY "Allow members to insert knowledge docs" ON public.crm_knowledge_documents
FOR INSERT WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.portal_organization_memberships WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Allow members to view their knowledge chunks" ON public.crm_knowledge_chunks;
CREATE POLICY "Allow members to view their knowledge chunks" ON public.crm_knowledge_chunks
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM public.portal_organization_memberships WHERE user_id = auth.uid()
  )
);

-- Trigger cập nhật updated_at
CREATE OR REPLACE FUNCTION public.set_crm_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_crm_knowledge_documents_updated_at ON public.crm_knowledge_documents;
CREATE TRIGGER trg_crm_knowledge_documents_updated_at
BEFORE UPDATE ON public.crm_knowledge_documents
FOR EACH ROW
EXECUTE FUNCTION public.set_crm_knowledge_updated_at();
