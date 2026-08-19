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

  const url = new URL(req.url);
  const entityId = url.searchParams.get('entity_id');
  const limit = url.searchParams.get('limit') || '100';

  let queryUrl = `${supabaseUrl}/rest/v1/audit_logs?order=created_at.desc&limit=${limit}`;
  if (entityId) {
    queryUrl += `&entity_id=eq.${entityId}`;
  }

  try {
    const res = await fetch(queryUrl, {
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
      entity_type: row.entity_type ? row.entity_type.toLowerCase() : '',
      entity_id: row.entity_id,
      actor_type: row.actor_type,
      agent_id: row.actor_agent_id || null,
      external_ref: row.actor_external_ref || null,
      action_type: row.action,
      metadata: { reason: row.reason, before: row.before_state, after: row.after_state },
      created_at: row.created_at,
      updated_at: row.updated_at
    }));
    return NextResponse.json({ audit_logs: data });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
