import { NextResponse } from 'next/server';
import { verifyUiAuth } from '@/lib/ui-auth-guard';
import { readPortalAccessToken, loadPortalOrganizationContext } from '@/lib/portal-auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const namespace = url.searchParams.get('namespace') || 'cskh';
  
  if (namespace && !['cskh', 'marketing'].includes(namespace)) {
    return NextResponse.json({ error: 'INVALID_NAMESPACE', message: 'Namespace must be cskh or marketing' }, { status: 400 });
  }
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

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'CONFIG_MISSING', message: 'Supabase config missing' }, { status: 500 });
    }

    let limit = parseInt(url.searchParams.get('limit') || '20', 10);
    if (isNaN(limit) || limit < 1) limit = 20;
    limit = Math.min(limit, 100);

    let offset = parseInt(url.searchParams.get('offset') || '0', 10);
    if (isNaN(offset) || offset < 0) offset = 0;

    const res = await fetch(`${supabaseUrl}/rest/v1/crm_knowledge_documents?organization_id=eq.${organizationId}&namespace=eq.${namespace}&order=created_at.desc&limit=${limit}&offset=${offset}`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      cache: 'no-store'
    });

    if (!res.ok) throw new Error(await res.text());
    
    const documents = await res.json();
    return NextResponse.json(documents);
  } catch (error: any) {
    console.error('Error fetching knowledge documents:', error);
    return new NextResponse(error.message, { status: 500 });
  }
}
