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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/chat_threads?thread_status=neq.CLOSED&order=created_at.desc`, {
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
      title: row.subject || '',
      purpose: row.purpose || '',
      status: row.thread_status || 'ACTIVE',
      last_activity_at: row.last_activity_at || row.created_at,
      metadata: row.metadata,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
    return NextResponse.json({ chat_threads: data });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}
