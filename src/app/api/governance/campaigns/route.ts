import { NextResponse } from 'next/server';
import { verifyUiAuth } from '@/lib/ui-auth-guard';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await verifyUiAuth(req);
    
    // Always fetch active campaigns for the current organization
    const res = await fetch(`${supabaseUrl}/rest/v1/campaigns?organization_id=eq.${auth.organizationId}&status=eq.active&select=id,name,description`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Accept-Profile': 'public'
      }
    });

    if (!res.ok) {
      return NextResponse.json({ state: 'error', reason: 'failed_to_fetch' }, { status: 500 });
    }

    const campaigns = await res.json();
    return NextResponse.json({ campaigns });
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ state: 'blocked', reason: 'unauthorized' }, { status: 401 });
    }
    console.error("Governance Campaigns Error:", error);
    return NextResponse.json({ state: 'error', reason: 'internal_error' }, { status: 500 });
  }
}
