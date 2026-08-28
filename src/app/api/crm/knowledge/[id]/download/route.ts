import { NextResponse } from 'next/server';
import { verifyUiAuth } from '@/lib/ui-auth-guard';
import { readPortalAccessToken, loadPortalOrganizationContext } from '@/lib/portal-auth';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUiAuth(req);
    if (!auth.ok) return auth.response;

    const token = readPortalAccessToken(req.headers);
    const orgContext = await loadPortalOrganizationContext(token || '', auth.user.id);
    if (orgContext.state !== 'ready') {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Org context not ready' }, { status: 403 });
    }

    const organizationId = orgContext.active_membership.organization_id;
    const { id: documentId } = await params;
    
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'CONFIG_MISSING', message: 'Supabase config missing' }, { status: 500 });
    }

    const headers = {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    };

    const docRes = await fetch(`${supabaseUrl}/rest/v1/crm_knowledge_documents?id=eq.${documentId}&organization_id=eq.${organizationId}&select=file_url,title`, { headers });
    
    if (!docRes.ok) throw new Error('Failed to fetch document');
    const docs = await docRes.json();
    if (docs.length === 0) return NextResponse.json({ error: 'NOT_FOUND', message: 'Document not found' }, { status: 404 });
    
    const fileUrl = docs[0].file_url;
    const title = docs[0].title;
    if (!fileUrl) return NextResponse.json({ error: 'NOT_FOUND', message: 'File path empty' }, { status: 404 });

    const signedUrlRes = await fetch(`${supabaseUrl}/storage/v1/object/sign/crm_knowledge_files/${fileUrl}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ expiresIn: 60 })
    });
    
    if (!signedUrlRes.ok) throw new Error('Failed to generate signed URL');
    const signedData = await signedUrlRes.json();
    
    let downloadUrl = `${supabaseUrl}/storage/v1${signedData.signedUrl || signedData.signedURL}`;
    downloadUrl += '&download=' + encodeURIComponent(title);

    return NextResponse.json({ success: true, url: downloadUrl });
  } catch (error: any) {
    console.error('Error generating download URL:', error);
    return NextResponse.json({ error: 'DOWNLOAD_FAILED', message: error.message }, { status: 500 });
  }
}
