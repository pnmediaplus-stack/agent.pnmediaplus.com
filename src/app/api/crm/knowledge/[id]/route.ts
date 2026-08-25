import { NextResponse } from 'next/server';
import { verifyUiAuth } from '@/lib/ui-auth-guard';
import { readPortalAccessToken, loadPortalOrganizationContext } from '@/lib/portal-auth';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

    // 1. Fetch document to get file_url for storage cleanup
    const docRes = await fetch(`${supabaseUrl}/rest/v1/crm_knowledge_documents?id=eq.${documentId}&organization_id=eq.${organizationId}&select=file_url`, {
      headers
    });
    
    if (!docRes.ok) throw new Error('Failed to fetch document');
    const docs = await docRes.json();
    if (docs.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Document not found or unauthorized' }, { status: 404 });
    }
    const fileUrl = docs[0].file_url;

    // 2. Delete from Postgres (CASCADE will handle chunks and ingestion runs)
    const delRes = await fetch(`${supabaseUrl}/rest/v1/crm_knowledge_documents?id=eq.${documentId}&organization_id=eq.${organizationId}`, {
      method: 'DELETE',
      headers
    });
    
    if (!delRes.ok) throw new Error('Failed to delete document record');

    // 3. Delete file from Storage bucket
    if (fileUrl) {
      await fetch(`${supabaseUrl}/storage/v1/object/crm_knowledge_files/${fileUrl}`, {
        method: 'DELETE',
        headers
      });
      // We don't block if storage delete fails (file might already be gone)
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting knowledge document:', error);
    return NextResponse.json({ error: 'DELETE_FAILED', message: error.message }, { status: 500 });
  }
}
