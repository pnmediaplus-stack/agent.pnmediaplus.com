import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchSupabaseRest, readRestJson, requireCrmRouteContext } from '@/lib/crm-api';

export const dynamic = 'force-dynamic';

const handoffSchema = z.object({
  threadId: z.string().uuid(),
  status: z.enum(['bot_handling', 'human_handling', 'resolved'])
});

export async function POST(req: Request) {
  try {
    const guard = await requireCrmRouteContext(req, handoffSchema);
    if (!guard.ok) return guard.response;

    const { organizationId, payload } = guard.context;
    const response = await fetchSupabaseRest('crm_threads', {
      method: 'PATCH',
      prefer: 'return=representation',
      searchParams: {
        organization_id: `eq.${organizationId}`,
        id: `eq.${payload.threadId}`
      },
      body: JSON.stringify({
        status: payload.status,
        unread_count: payload.status === 'human_handling' ? 0 : undefined
      })
    });

    if (!response.ok) {
      console.error('CRM_THREAD_HANDOFF_FAILED', await response.text());
      return NextResponse.json({ error: 'CRM_THREAD_HANDOFF_FAILED' }, { status: 502 });
    }

    const [thread] = await readRestJson<unknown[]>(response);
    if (!thread) {
      return NextResponse.json({ error: 'THREAD_NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json(thread);
  } catch (error) {
    console.error('Error toggling CRM handoff:', error);
    return NextResponse.json({ error: 'CRM_THREAD_HANDOFF_FAILED' }, { status: 500 });
  }
}

