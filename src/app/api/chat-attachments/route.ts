import { NextRequest, NextResponse } from 'next/server';
import { verifyUiAuth } from '@/lib/ui-auth-guard';
import { readPortalAccessToken, loadPortalOrganizationContext } from '@/lib/portal-auth';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

export async function POST(req: NextRequest) {
  try {
    const auth = await verifyUiAuth(req);
    if (!auth.ok) return auth.response;

    const token = readPortalAccessToken(req.headers);
    const orgContext = await loadPortalOrganizationContext(token || '', auth.user.id);

    if (orgContext.state !== 'ready') {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Org context not ready' }, { status: 403 });
    }

    const organizationId = orgContext.active_membership.organization_id;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'SERVER_CONFIG_ERROR', message: 'Supabase credentials missing' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'No file provided' }, { status: 400 });
    }

    // 1. Validate Size, Name & MIME Type
    if (file.size === 0) {
      return NextResponse.json({ error: 'EMPTY_FILE', message: 'File cannot be empty' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'FILE_TOO_LARGE', message: 'File exceeds 50MB limit' }, { status: 400 });
    }

    if (!file.name || file.name.trim() === '') {
      return NextResponse.json({ error: 'INVALID_FILENAME', message: 'File name cannot be empty' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'INVALID_FILE_TYPE', message: 'File type not allowed' }, { status: 400 });
    }

    const fileBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(fileBuffer);
    let isMagicValid = false;

    if (file.type === 'application/pdf') {
      isMagicValid = bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46; // %PDF
    } else if (file.type === 'image/png') {
      isMagicValid = bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47; // PNG
    } else if (file.type === 'image/jpeg') {
      isMagicValid = bytes.length >= 3 && bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF; // JPEG
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      isMagicValid = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04; // ZIP/DOCX
    } else if (file.type === 'text/plain') {
      isMagicValid = true; // Hard to validate txt via magic bytes, skip for now.
    }

    if (!isMagicValid) {
      return NextResponse.json({ error: 'INVALID_FILE_SIGNATURE', message: 'File signature does not match declared type' }, { status: 400 });
    }

    // 2. Namespace the object name
    const timestamp = Date.now();
    // Normalize filename to prevent path traversal
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const objectPath = `${organizationId}/${auth.user.id}/${timestamp}_${safeFilename}`;

    // 3. Upload to Cloudflare R2
    const { uploadBufferToR2 } = await import('@/lib/r2-client');
    const r2ObjectKey = `chat-attachments/${objectPath}`;
    
    try {
      await uploadBufferToR2(r2ObjectKey, new Uint8Array(fileBuffer), file.type);
    } catch (err) {
      console.error('R2 Upload Error:', err);
      return NextResponse.json({ error: 'UPLOAD_FAILED', message: 'Failed to upload to R2' }, { status: 500 });
    }

    // 4. Return the public proxy path
    const publicUrl = `/api/assets/public/${r2ObjectKey}`;

    return NextResponse.json({
      success: true,
      path: r2ObjectKey,
      signedUrl: publicUrl
    });

  } catch (error) {
    console.error('Chat Attachment Upload Error:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }, { status: 500 });
  }
}
