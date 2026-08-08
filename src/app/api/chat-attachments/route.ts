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

    // 1. Validate Size & MIME Type (Gatekeeper requirement: don't strictly trust client, but we check what we get. Supabase also enforces on the bucket level.)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'FILE_TOO_LARGE', message: 'File exceeds 50MB limit' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'INVALID_FILE_TYPE', message: 'File type not allowed' }, { status: 400 });
    }

    // 2. Namespace the object name
    const timestamp = Date.now();
    // Normalize filename to prevent path traversal
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const objectPath = `${organizationId}/${auth.user.id}/${timestamp}_${safeFilename}`;

    // 3. Upload to Supabase Storage via REST
    const uploadUrl = `${supabaseUrl}/storage/v1/object/phase1_chat_attachments/${objectPath}`;
    
    const fileBuffer = await file.arrayBuffer();
    
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': file.type
      },
      body: fileBuffer
    });

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      console.error('Storage Upload Error:', errorText);
      return NextResponse.json({ error: 'UPLOAD_FAILED', message: 'Failed to upload to storage' }, { status: 500 });
    }

    // 4. Create Short-lived Signed URL (Gatekeeper requirement)
    const signUrl = `${supabaseUrl}/storage/v1/object/sign/phase1_chat_attachments/${objectPath}`;
    const signRes = await fetch(signUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ expiresIn: 3600 }) // 1 hour
    });

    if (!signRes.ok) {
      const errorText = await signRes.text();
      console.error('Storage Sign Error:', errorText);
      return NextResponse.json({ error: 'SIGN_FAILED', message: 'Failed to generate signed url' }, { status: 500 });
    }

    const signData = await signRes.json();

    return NextResponse.json({ 
      success: true, 
      path: objectPath,
      signedUrl: signData.signedURL
    });

  } catch (error) {
    console.error('Chat Attachment Upload Error:', error);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }, { status: 500 });
  }
}
