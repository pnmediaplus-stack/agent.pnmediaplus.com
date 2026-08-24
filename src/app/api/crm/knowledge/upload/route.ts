import { NextResponse } from 'next/server';
import { verifyUiAuth } from '@/lib/ui-auth-guard';
import { readPortalAccessToken, loadPortalOrganizationContext } from '@/lib/portal-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = await verifyUiAuth(req);
    if (!auth.ok) return auth.response;

    const token = readPortalAccessToken(req.headers);
    const orgContext = await loadPortalOrganizationContext(token || '', auth.user.id);
    if (orgContext.state !== 'ready') {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Org context not ready' }, { status: 403 });
    }

    const organizationId = orgContext.active_membership.organization_id;
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;

    if (!file || !title) {
      return NextResponse.json({ error: 'Missing file or title' }, { status: 400 });
    }

    // 1. Upload to Supabase Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${organizationId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    // Convert File to ArrayBuffer for fetch
    const arrayBuffer = await file.arrayBuffer();
    
    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/crm_knowledge_files/${fileName}`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'true'
      },
      body: arrayBuffer
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      console.error('Storage upload failed:', err);
      return NextResponse.json({ error: 'UPLOAD_FAILED' }, { status: 502 });
    }
    
    const fileUrl = `${supabaseUrl}/storage/v1/object/public/crm_knowledge_files/${fileName}`; // Though bucket is not public, we might need a signed URL. 
    // Wait, n8n can use service role to download if it's private. Let's just store the path so n8n can fetch it.
    const storagePath = fileName;

    // 2. Insert into crm_knowledge_documents
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/crm_knowledge_documents`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        organization_id: organizationId,
        title: title,
        file_url: storagePath,
        status: 'pending',
        created_by: auth.user.id
      })
    });

    if (!insertRes.ok) {
      return NextResponse.json({ error: 'DB_INSERT_FAILED' }, { status: 502 });
    }

    const docs = await insertRes.json();
    const document = docs[0];

    // 3. Trigger n8n Ingestion Webhook
    const n8nUrl = process.env.N8N_KNOWLEDGE_INGESTION_WEBHOOK_URL;
    if (n8nUrl) {
      fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: document.id,
          organization_id: organizationId,
          file_path: storagePath
        })
      }).catch(e => console.error('Error triggering n8n ingestion:', e));
    } else {
      console.warn("N8N_KNOWLEDGE_INGESTION_WEBHOOK_URL not configured. Document remains pending.");
    }

    return NextResponse.json(document);
  } catch (error: any) {
    console.error('Error uploading knowledge document:', error);
    return new NextResponse(error.message, { status: 500 });
  }
}
