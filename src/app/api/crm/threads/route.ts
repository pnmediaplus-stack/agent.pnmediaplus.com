import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchSupabaseRest, readRestJson, requireCrmRouteContext } from '@/lib/crm-api';

export const dynamic = 'force-dynamic';

const threadsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export async function GET(req: Request) {
  try {
    const guard = await requireCrmRouteContext(req, threadsQuerySchema);
    if (!guard.ok) return guard.response;

    const { organizationId, payload } = guard.context;
    const response = await fetchSupabaseRest('crm_threads', {
      searchParams: {
        organization_id: `eq.${organizationId}`,
        select: 'id,status,last_message_at,unread_count,channel_id,customer_id,tags,channel:crm_channels(channel_name,channel_type,avatar_url),customer:crm_customers(id,full_name,phone_number,tags,email,address,notes,lead_score)',
        order: 'last_message_at.desc',
        limit: payload.limit
      }
    });

    if (!response.ok) {
      console.error('CRM_THREADS_FETCH_FAILED', await response.text());
      return NextResponse.json({ error: 'CRM_THREADS_FETCH_FAILED' }, { status: 502 });
    }

    return NextResponse.json(await readRestJson<unknown[]>(response));
  } catch (error) {
    console.error('Error fetching CRM threads:', error);
    return NextResponse.json({ error: 'CRM_THREADS_FETCH_FAILED' }, { status: 500 });
  }
}

