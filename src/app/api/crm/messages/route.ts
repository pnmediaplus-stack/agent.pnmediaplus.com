import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchSupabaseRest, readRestJson, requireCrmRouteContext } from '@/lib/crm-api';

export const dynamic = 'force-dynamic';

const messagesQuerySchema = z.object({
  threadId: z.string().uuid()
});

export async function GET(req: Request) {
  try {
    const guard = await requireCrmRouteContext(req, messagesQuerySchema);
    if (!guard.ok) return guard.response;

    const { organizationId, payload } = guard.context;
    const response = await fetchSupabaseRest('crm_messages', {
      searchParams: {
        organization_id: `eq.${organizationId}`,
        thread_id: `eq.${payload.threadId}`,
        order: 'created_at.asc'
      }
    });

    if (!response.ok) {
      console.error('CRM_MESSAGES_FETCH_FAILED', await response.text());
      return NextResponse.json({ error: 'CRM_MESSAGES_FETCH_FAILED' }, { status: 502 });
    }

    return NextResponse.json(await readRestJson<unknown[]>(response));
  } catch (error) {
    console.error('Error fetching CRM messages:', error);
    return NextResponse.json({ error: 'CRM_MESSAGES_FETCH_FAILED' }, { status: 500 });
  }
}

