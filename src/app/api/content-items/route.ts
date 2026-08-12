import { NextRequest, NextResponse } from 'next/server';
import { verifyUiAuth } from '@/lib/ui-auth-guard';
import { readPortalAccessToken, loadPortalOrganizationContext } from '@/lib/portal-auth';

export async function POST(req: Request) {
  const auth = await verifyUiAuth(req);
  if (!auth.ok) return auth.response;

  const token = readPortalAccessToken(req.headers);
  const orgContext = await loadPortalOrganizationContext(token || '', auth.user.id);
  
  if (orgContext.state !== 'ready' || !['admin', 'manager', 'owner'].includes(orgContext.active_membership.role)) {
    await auth.logAudit('CONTENT_ITEM_CREATE_FORBIDDEN', 'User attempted to create a content item without sufficient role');
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin or Manager role is required to create content items.' }, { status: 403 });
  }

  const organizationId = orgContext.active_membership.organization_id;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { content_key, title, brief, task_owner_ref } = body;

    if (!content_key || !title) {
      return NextResponse.json({ error: 'Missing required fields (content_key, title)' }, { status: 400 });
    }

    const payload = {
      organization_id: organizationId,
      content_key,
      title,
      brief: brief || null,
      task_owner_ref: task_owner_ref || null,
      owner_ref: auth.user.id,
      current_state: 'idea',
      updated_at: new Date().toISOString()
    };

    const res = await fetch(`${supabaseUrl}/rest/v1/phase2_content_items`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Accept-Profile': 'pn_os_ai_department',
        'Content-Profile': 'pn_os_ai_department',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      if (err.code === '23505') {
         return NextResponse.json({ error: 'A content item with this key already exists in your organization' }, { status: 409 });
      }
      throw new Error(JSON.stringify(err));
    }

    const created = await res.json();
    await auth.logAudit('CONTENT_ITEM_CREATED', 'User created a new content item via UI', { content_key });

    return NextResponse.json({ success: true, contentItem: created[0] });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to create content item' }, { status: 500 });
  }
}
