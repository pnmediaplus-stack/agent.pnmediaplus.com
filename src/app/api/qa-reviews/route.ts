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
    // Fetch Phase 1 QA Reviews
    const res1 = fetch(`${supabaseUrl}/rest/v1/qa_reviews?organization_id=eq.${organizationId}&order=created_at.desc`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Accept-Profile': 'pn_os_ai_department'
      },
      cache: 'no-store'
    });

    // Fetch Phase 2 QA Reviews (Join with content_items to filter by organization_id)
    const res2 = fetch(`${supabaseUrl}/rest/v1/phase2_qa_reviews?select=*,content_items!inner(organization_id)&content_items.organization_id=eq.${organizationId}&order=created_at.desc`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      cache: 'no-store'
    });

    const [r1, r2] = await Promise.all([res1, res2]);

    let phase1Data = [];
    if (r1.ok) {
      phase1Data = await r1.json();
    } else {
      console.error("Phase 1 Fetch Error:", await r1.text());
    }

    let phase2Data = [];
    if (r2.ok) {
      phase2Data = await r2.json();
    } else {
      console.error("Phase 2 Fetch Error:", await r2.text());
    }

    // Map Phase 2 data to match the UI interface for Phase 1
    const mappedPhase2Data = phase2Data.map((item: any) => ({
      id: item.id,
      organization_id: item.content_items?.organization_id,
      artifact_version_id: item.content_item_id, // Map content_item_id to artifact_version_id for display
      task_id: item.agent_task_id,
      reviewer_actor_type: 'agent',
      reviewer_agent_id: item.reviewer_ref,
      reviewer_external_ref: item.reviewer_ref,
      verdict: item.verdict, // 'pass' or 'reject'
      notes: item.notes,
      evidence_ref: item.evidence_ref,
      created_at: item.created_at,
      updated_at: item.updated_at
    }));

    const combinedData = [...phase1Data, ...mappedPhase2Data].sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return NextResponse.json({ qa_reviews: combinedData });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch qa reviews' }, { status: 500 });
  }
}
