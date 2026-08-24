-- Description: Phase 5 - Knowledge Base Storage Bucket
-- Khởi tạo Storage Bucket crm_knowledge_files

INSERT INTO storage.buckets (id, name, public) 
VALUES ('crm_knowledge_files', 'crm_knowledge_files', false)
ON CONFLICT (id) DO NOTHING;

-- RLS cho Bucket
CREATE POLICY "Allow members to upload knowledge files" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'crm_knowledge_files' AND
    auth.uid() IS NOT NULL
);

CREATE POLICY "Allow members to view knowledge files" ON storage.objects
FOR SELECT USING (
    bucket_id = 'crm_knowledge_files' AND
    auth.uid() IS NOT NULL
);
