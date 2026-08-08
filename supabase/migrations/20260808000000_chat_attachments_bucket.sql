-- Create the private bucket for chat attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'phase1_chat_attachments',
  'phase1_chat_attachments',
  false,
  52428800, -- 50MB
  ARRAY['image/png', 'image/jpeg', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
) ON CONFLICT (id) DO NOTHING;

-- Revoke public access to objects in this bucket
CREATE POLICY "Deny public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'phase1_chat_attachments' AND false);

CREATE POLICY "Deny public insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'phase1_chat_attachments' AND false);
