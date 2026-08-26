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
    const channelIdStr = formData.get('channel_id') as string;
    const channelId = (channelIdStr && channelIdStr !== 'null' && channelIdStr !== 'undefined' && channelIdStr.trim() !== '') ? channelIdStr : null;

    if (!file || !title) {
      return NextResponse.json({ error: 'Missing file or title' }, { status: 400 });
    }

    const allowedMimeTypes = new Set([
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/markdown',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]);

    if (!allowedMimeTypes.has(file.type) && !/\.(pdf|txt|md|docx?)$/i.test(file.name)) {
      return NextResponse.json({ error: 'UNSUPPORTED_FILE_TYPE', message: 'Only PDF, TXT, MD, and DOC/DOCX files are supported' }, { status: 400 });
    }

    // 2. Upload File to Supabase Storage (crm_knowledge)
    const fileExt = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const storagePath = `${organizationId}/${fileName}`;
    
    // Convert File to ArrayBuffer for fetch
    const arrayBuffer = await file.arrayBuffer();
    
    const uploadRes = await fetch(`${supabaseUrl}/storage/v1/object/crm_knowledge_files/${storagePath}`, {
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

    // 3. Insert into crm_knowledge_documents
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
        channel_id: channelId,
        title: title,
        file_url: storagePath,
        status: 'processing',
        created_by: auth.user.id
      })
    });

    if (!insertRes.ok) {
      const errTxt = await insertRes.text();
      console.error('DB Insert Error:', errTxt);
      return NextResponse.json({ error: 'DB_INSERT_FAILED' }, { status: 502 });
    }

    const docs = await insertRes.json();
    const document = docs[0];

    // 4. Trigger n8n Ingestion Webhook
    const n8nUrl = process.env.N8N_KNOWLEDGE_INGESTION_WEBHOOK_URL;
    if (n8nUrl) {
      const webhookRes = await fetch(n8nUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: document.id,
          organization_id: organizationId,
          channel_id: channelId,
          file_path: storagePath,
          file_name: file.name,
          mime_type: file.type || 'application/octet-stream'
        })
      });

      if (!webhookRes.ok) {
        const webhookError = await webhookRes.text().catch(() => 'N8N_INGESTION_TRIGGER_FAILED');
        await fetch(`${supabaseUrl}/rest/v1/crm_knowledge_documents?id=eq.${document.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            status: 'failed',
            error_message: webhookError.slice(0, 500)
          })
        });
        return NextResponse.json({ error: 'N8N_INGESTION_TRIGGER_FAILED', message: webhookError }, { status: 502 });
      }
    } else {
      await fetch(`${supabaseUrl}/rest/v1/crm_knowledge_documents?id=eq.${document.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          status: 'failed',
          error_message: 'N8N_KNOWLEDGE_INGESTION_WEBHOOK_URL not configured'
        })
      });
      return NextResponse.json({ error: 'CONFIG_MISSING', message: 'N8N ingestion webhook not configured' }, { status: 500 });
    }

    return NextResponse.json(document);
  } catch (error: any) {
    console.error('Error uploading knowledge document:', error);
    return new NextResponse(error.message, { status: 500 });
  }
}
