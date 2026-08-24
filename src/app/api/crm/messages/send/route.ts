import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchSupabaseRest, readRestJson, requireCrmRouteContext } from '@/lib/crm-api';

export const dynamic = 'force-dynamic';

const sendMessageSchema = z.object({
  threadId: z.string().uuid(),
  content: z.string().trim().min(1).max(4000)
});

type CrmThreadRow = {
  id: string;
  status: 'bot_handling' | 'human_handling' | 'resolved';
};

type CrmMessageRow = {
  id: string;
  thread_id: string;
  created_at: string;
};

export async function POST(req: Request) {
  try {
    const guard = await requireCrmRouteContext(req, sendMessageSchema);
    if (!guard.ok) return guard.response;

    const { organizationId, payload } = guard.context;
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
      return NextResponse.json({ error: 'CRM_THREAD_LOOKUP_FAILED' }, { status: 502 });
    }

    const [thread] = await readRestJson<CrmThreadRow[]>(threadResponse);
    if (!thread) {
      return NextResponse.json({ error: 'THREAD_NOT_FOUND' }, { status: 404 });
    }

    if (thread.status !== 'human_handling') {
      return NextResponse.json(
        { error: 'HUMAN_HANDOFF_REQUIRED', message: 'Thread must be in human_handling before staff can send messages.' },
        { status: 409 }
      );
    }

    const insertResponse = await fetchSupabaseRest('crm_messages', {
      method: 'POST',
      prefer: 'return=representation',
      body: JSON.stringify({
        organization_id: organizationId,
        thread_id: payload.threadId,
        sender_type: 'human',
        content: payload.content,
        delivery_status: 'queued'
      })
    });

    if (!insertResponse.ok) {
      console.error('CRM_MESSAGE_INSERT_FAILED', await insertResponse.text());
      return NextResponse.json({ error: 'CRM_MESSAGE_INSERT_FAILED' }, { status: 502 });
    }

    const [message] = await readRestJson<CrmMessageRow[]>(insertResponse);
    if (!message) {
      return NextResponse.json({ error: 'CRM_MESSAGE_INSERT_EMPTY' }, { status: 502 });
    }

    // --- OUTBOUND DISPATCH ---
    // Trigger n8n outbound worker which has access to vault and BYOK redemption
    const n8nOutboundUrl = process.env.N8N_CSKH_OUTBOUND_WEBHOOK_URL;
    if (!n8nOutboundUrl) {
      console.error("N8N_CSKH_OUTBOUND_WEBHOOK_URL is not configured.");
      await fetchSupabaseRest('crm_messages', {
        method: 'PATCH',
        searchParams: { id: `eq.${message.id}` },
        body: JSON.stringify({ delivery_status: 'failed' })
      });
      return NextResponse.json({ 
        error: 'MISSING_OUTBOUND_CONFIG', 
        message: { ...message, delivery_status: 'failed' } 
      }, { status: 502 });
    }

    try {
      const dispatchRes = await fetch(n8nOutboundUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_human_reply",
          organization_id: organizationId,
          thread_id: payload.threadId,
          message_id: message.id,
          content: payload.content
        })
      });

      if (!dispatchRes.ok) {
        console.error("N8N_OUTBOUND_DISPATCH_REJECTED", await dispatchRes.text());
        
        // Mark as failed in DB since worker rejected it
        await fetchSupabaseRest('crm_messages', {
          method: 'PATCH',
          searchParams: { id: `eq.${message.id}` },
          body: JSON.stringify({ delivery_status: 'failed' })
        });
        
        return NextResponse.json({ 
          error: 'N8N_OUTBOUND_DISPATCH_REJECTED',
          message: { ...message, delivery_status: 'failed' }
        }, { status: 502 });
      }
    } catch (e) {
      console.error("Error calling n8n outbound webhook:", e);
      // Mark as failed in DB since worker is unreachable
      await fetchSupabaseRest('crm_messages', {
        method: 'PATCH',
        searchParams: { id: `eq.${message.id}` },
        body: JSON.stringify({ delivery_status: 'failed' })
      });
      return NextResponse.json({ 
        error: 'N8N_OUTBOUND_DISPATCH_FAILED',
        message: { ...message, delivery_status: 'failed' }
      }, { status: 502 });
    }

    const threadUpdateResponse = await fetchSupabaseRest('crm_threads', {
      method: 'PATCH',
      searchParams: {
        organization_id: `eq.${organizationId}`,
        id: `eq.${payload.threadId}`
      },
      body: JSON.stringify({
        last_message_at: message.created_at,
        unread_count: 0
      })
    });

    if (!threadUpdateResponse.ok) {
      console.error('CRM_THREAD_TOUCH_FAILED', await threadUpdateResponse.text());
    }

    return NextResponse.json(message);
  } catch (error) {
    console.error('Error sending CRM message:', error);
    return NextResponse.json({ error: 'CRM_MESSAGE_SEND_FAILED' }, { status: 500 });
  }
}

