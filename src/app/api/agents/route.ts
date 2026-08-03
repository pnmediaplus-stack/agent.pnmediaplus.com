import { NextRequest, NextResponse } from 'next/server';
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
    const res = await fetch(`${supabaseUrl}/rest/v1/agents?organization_id=eq.${organizationId}&order=created_at.desc`, {
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

    const agents = await res.json();
    return NextResponse.json({ agents });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await verifyUiAuth(req);
  if (!auth.ok) return auth.response;

  const token = readPortalAccessToken(req.headers);
  const orgContext = await loadPortalOrganizationContext(token || '', auth.user.id);
  
  if (orgContext.state !== 'ready' || !['admin', 'manager', 'owner'].includes(orgContext.active_membership.role)) {
    await auth.logAudit('AGENT_CREATE_FORBIDDEN', 'User attempted to create an agent without sufficient role');
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin or Manager role is required to modify agents.' }, { status: 403 });
  }

  const organizationId = orgContext.active_membership.organization_id;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { department_id, agent_key, canonical_name, role_code, authority_scope } = body;

    if (!department_id || !agent_key || !canonical_name || !role_code || !authority_scope) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const payload = {
      organization_id: organizationId,
      department_id,
      agent_key,
      canonical_name,
      role_code,
      authority_scope,
      state: 'DRAFT',
      updated_at: new Date().toISOString()
    };

    const res = await fetch(`${supabaseUrl}/rest/v1/agents`, {
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
         return NextResponse.json({ error: 'An agent with this key already exists in your organization' }, { status: 409 });
      }
      throw new Error(JSON.stringify(err));
    }

    const created = await res.json();
    await auth.logAudit('AGENT_CREATED', 'User created a new agent', { agent_key });

    return NextResponse.json({ success: true, agent: created[0] });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}
