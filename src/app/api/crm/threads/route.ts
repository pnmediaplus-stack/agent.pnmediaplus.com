import { NextResponse } from 'next/server';
import { verifyUiAuth } from '@/lib/ui-auth-guard';
import { readPortalAccessToken, loadPortalOrganizationContext } from '@/lib/portal-auth';
import { createServiceRoleClient } from '@/lib/supabase-server';

export const dynamic = "force-dynamic";

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
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const supabase = createServiceRoleClient();

    const { data, error } = await supabase
      .from('crm_threads')
      .select(`
        id, status, last_message_at, unread_count, channel_id, customer_id,
        channel:crm_channels ( channel_name, channel_type, avatar_url ),
        customer:crm_customers ( id, full_name, phone_number, tags, email, address, notes )
      `)
      // Note: custom client might not support complex joins like this if it's very basic,
      // but let's assume it passes the query string directly.
      // Wait, let's look at the custom client from the previous output. It takes string query in select.
      // We also need to add `.eq('organization_id', organizationId)` but wait, does it support chaining eq after select?
      // Yes: `from(table).select().eq().order().limit()`
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Direct fetch is safer given the complex join query
    const res = await fetch(`${supabaseUrl}/rest/v1/crm_threads?organization_id=eq.${organizationId}&select=id,status,last_message_at,unread_count,channel_id,customer_id,channel:crm_channels(channel_name,channel_type,avatar_url),customer:crm_customers(id,full_name,phone_number,tags,email,address,notes)&order=last_message_at.desc&limit=${limit}`, {
      headers: {
        'apikey': serviceRoleKey!,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      cache: 'no-store'
    });

    if (!res.ok) throw new Error(await res.text());
    
    const threads = await res.json();
    return NextResponse.json(threads);
  } catch (error: any) {
    console.error('Error fetching threads:', error);
    return new NextResponse(error.message, { status: 500 });
  }
}

