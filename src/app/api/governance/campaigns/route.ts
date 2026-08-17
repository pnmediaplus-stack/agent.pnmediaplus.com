import { NextResponse } from 'next/server';
import { verifyUiAuth } from '@/lib/ui-auth-guard';
import { readPortalAccessToken, loadPortalOrganizationContext } from '@/lib/portal-auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await verifyUiAuth(req);
    if (!auth.ok) return auth.response;

    const token = readPortalAccessToken(req.headers);
    const orgContext = await loadPortalOrganizationContext(token || '', auth.user.id);
    
    if (orgContext.state !== 'ready') {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Org context not ready' }, { status: 403 });
    }

    const organizationId = orgContext.active_membership.organization_id;
    
    // Always fetch active campaigns for the current organization
    const res = await fetch(`${supabaseUrl}/rest/v1/campaigns?organization_id=eq.${organizationId}&status=eq.active&select=id,name,description`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Accept-Profile': 'public'
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      return NextResponse.json({ state: 'error', reason: 'failed_to_fetch' }, { status: 500 });
    }

    const campaigns = await res.json();
    return NextResponse.json({ campaigns });
  } catch (error: any) {
    console.error("Governance Campaigns Error:", error);
    return NextResponse.json({ state: 'error', reason: 'internal_error' }, { status: 500 });
  }
}
