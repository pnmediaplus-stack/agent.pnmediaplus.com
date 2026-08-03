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
    // Fetch tasks using service_role but filtered to the current organization
    // Using select=*,departments(id,canonical_name),agents(id,canonical_name) might work if postgREST detects relations, 
    // but to be safe and simple we just fetch tasks. The UI can stitch them if needed.
    const res = await fetch(`${supabaseUrl}/rest/v1/tasks?organization_id=eq.${organizationId}&order=created_at.desc`, {
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

    const tasks = await res.json();
    return NextResponse.json({ tasks });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await verifyUiAuth(req);
  if (!auth.ok) return auth.response;

  const token = readPortalAccessToken(req.headers);
  const orgContext = await loadPortalOrganizationContext(token || '', auth.user.id);
  
  // Gatekeeper enforcement: Only Admin/Manager can create tasks
  if (orgContext.state !== 'ready' || !['admin', 'manager', 'owner'].includes(orgContext.active_membership.role)) {
    await auth.logAudit('TASK_CREATE_FORBIDDEN', 'User attempted to assign a task without sufficient role');
    return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin or Manager role is required to assign tasks.' }, { status: 403 });
  }

  const organizationId = orgContext.active_membership.organization_id;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { department_id, owner_agent_id, task_key, title, summary, priority } = body;

    if (!department_id || !task_key || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const payload = {
      organization_id: organizationId,
      department_id,
      task_key,
      title,
      summary: summary || '',
      priority: priority || 50,
      owner_agent_id: owner_agent_id || null, // Optional, can be unassigned
      state: 'NOT_STARTED',
      requester_actor_type: 'HUMAN',
      requester_external_ref: auth.user.id,
      updated_at: new Date().toISOString()
    };

    const res = await fetch(`${supabaseUrl}/rest/v1/tasks`, {
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
         return NextResponse.json({ error: 'A task with this key already exists in your organization' }, { status: 409 });
      }
      throw new Error(JSON.stringify(err));
    }

    const created = await res.json();
    await auth.logAudit('TASK_CREATED', 'User created a new task', { task_key, owner_agent_id });

    return NextResponse.json({ success: true, task: created[0] });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
