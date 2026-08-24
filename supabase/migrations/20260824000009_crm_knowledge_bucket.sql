-- Description: Phase 5 - Knowledge Base Storage Bucket
-- Khởi tạo Storage Bucket crm_knowledge_files

INSERT INTO storage.buckets (id, name, public) 
VALUES ('crm_knowledge_files', 'crm_knowledge_files', false)
ON CONFLICT (id) DO NOTHING;

-- RLS cho Bucket
DROP POLICY IF EXISTS "Allow members to upload knowledge files" ON storage.objects;
CREATE POLICY "Allow members to upload knowledge files" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'crm_knowledge_files' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1
        FROM public.portal_organization_memberships m
        WHERE m.user_id = auth.uid()
          AND m.organization_id = split_part(name, '/', 1)::uuid
    )
);

DROP POLICY IF EXISTS "Allow members to view knowledge files" ON storage.objects;
CREATE POLICY "Allow members to view knowledge files" ON storage.objects
FOR SELECT USING (
    bucket_id = 'crm_knowledge_files' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1
        FROM public.portal_organization_memberships m
        WHERE m.user_id = auth.uid()
          AND m.organization_id = split_part(name, '/', 1)::uuid
    )
);
