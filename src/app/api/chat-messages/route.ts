import { NextResponse } from 'next/server';
import { verifyUiAuth } from '@/lib/ui-auth-guard';
import { readPortalAccessToken, loadPortalOrganizationContext } from '@/lib/portal-auth';

export async function GET(req: Request) {
  const auth = await verifyUiAuth(req);
  if (!auth.ok) return auth.response;

  const token = readPortalAccessToken(req.headers);
  const orgContext = await loadPortalOrganizationContext(token || '', auth.user.id);
  
  if (orgContext.state !== 'ready') {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Org context not ready' }, { status: 403 });
  }

  const organizationId = orgContext.active_membership.organization_id;
  
  const { searchParams } = new URL(req.url);
  const threadId = searchParams.get('thread_id');
  
  if (!threadId) {
    return NextResponse.json({ error: 'Missing thread_id' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // Verify that the thread belongs to the current tenant
  const ownershipRes = await fetch(`${supabaseUrl}/rest/v1/chat_threads?id=eq.${threadId}&select=departments!inner(organization_id)`, {
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Accept-Profile': 'pn_os_ai_department'
    },
    cache: 'no-store'
  });
  
  if (!ownershipRes.ok) {
    return NextResponse.json({ error: 'Failed to verify thread ownership' }, { status: 500 });
  }
  
  const ownershipData = await ownershipRes.json();
  if (!ownershipData || ownershipData.length === 0 || ownershipData[0].departments?.organization_id !== organizationId) {
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Thread not found or ownership mismatch' }, { status: 403 });
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/chat_messages?thread_id=eq.${threadId}&order=created_at.asc`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Accept-Profile': 'pn_os_ai_department'
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }

    const rawData = await res.json();
    const data = rawData.map((row: any) => ({
      id: row.id,
      organization_id: row.organization_id || '',
      thread_id: row.thread_id,
      sender: row.actor_type ? row.actor_type.toLowerCase() : 'system',
      body: row.content || '',
      intent_type: row.intent_type,
      metadata: row.metadata,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
    return NextResponse.json({ chat_messages: data });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
