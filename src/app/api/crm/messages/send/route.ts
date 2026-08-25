import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchSupabaseRest, readRestJson, requireCrmRouteContext } from '@/lib/crm-api';

export const dynamic = 'force-dynamic';

const sendMessageSchema = z.object({
  threadId: z.string().uuid(),
  content: z.string().trim().min(1).max(4000)
});

export async function POST(req: Request) {
  try {
    const guard = await requireCrmRouteContext(req, sendMessageSchema);
    if (!guard.ok) return guard.response;

    const { organizationId, payload } = guard.context;
    
    // 1. Check if thread is in human_handling mode
    const threadResponse = await fetchSupabaseRest('crm_threads', {
      searchParams: {
        organization_id: `eq.${organizationId}`,
        id: `eq.${payload.threadId}`,
        select: 'id,status',
        limit: 1
      }
    });

    if (!threadResponse.ok) {
      console.error('CRM_THREAD_LOOKUP_FAILED', await threadResponse.text());
      return NextResponse.json({ error: 'CRM_THREAD_LOOKUP_FAILED' }, { status: 422 });
    }

    const [thread] = await readRestJson<any[]>(threadResponse);
    if (!thread) {
      return NextResponse.json({ error: 'THREAD_NOT_FOUND' }, { status: 404 });
    }

    if (thread.status !== 'human_handling') {
      return NextResponse.json(
        { error: 'HUMAN_HANDOFF_REQUIRED', message: 'Hội thoại phải ở trạng thái "human_handling" (nhân viên xử lý) thì bạn mới có thể gửi tin nhắn.' },
        { status: 409 }
      );
    }

    // 2. Dispatch the message via internal API (reuses Facebook BYOK and Simulator logic)
    const host = req.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const dispatchUrl = `${protocol}://${host}/api/internal/crm/messages/dispatch`;
    const expectedSecret = (process.env.CONTROL_PLANE_SECRET || '').trim();

    const dispatchRes = await fetch(dispatchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${expectedSecret}`
      },
      body: JSON.stringify({
        organization_id: organizationId,
        thread_id: payload.threadId,
        content: payload.content,
        sender_type: 'human'
      })
    });

    const dispatchData = await dispatchRes.json().catch(() => ({}));

    if (!dispatchRes.ok) {
      console.error('DISPATCH_FAILED', dispatchData);
      return NextResponse.json({ 
        error: dispatchData.error || 'DISPATCH_FAILED',
        message: dispatchData.message 
      }, { status: dispatchRes.status });
    }

    return NextResponse.json(dispatchData.message || { success: true });
  } catch (error) {
    console.error('Error sending CRM message:', error);
    return NextResponse.json({ error: 'CRM_MESSAGE_SEND_FAILED' }, { status: 500 });
  }
}
