import { NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchSupabaseRest, readRestJson } from '@/lib/crm-api';

export const dynamic = 'force-dynamic';

const dispatchSchema = z.object({
  organization_id: z.string().uuid(),
  thread_id: z.string().uuid(),
  content: z.string().trim().min(1),
  sender_type: z.enum(['bot', 'human']).default('bot')
});

async function patchMessageStatus(params: {
  organizationId: string;
  messageId: string;
  deliveryStatus: 'queued' | 'sent' | 'failed';
}) {
  await fetchSupabaseRest('crm_messages', {
    method: 'PATCH',
    searchParams: {
      organization_id: `eq.${params.organizationId}`,
      id: `eq.${params.messageId}`
    },
    body: JSON.stringify({
      delivery_status: params.deliveryStatus
    })
  });
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const internalSecretHeader = req.headers.get('x-internal-secret') || '';
    const bearerToken = authHeader.replace('Bearer ', '').trim();
    const expectedSecret = (process.env.CONTROL_PLANE_SECRET || '').trim();

    if (!expectedSecret || (bearerToken !== expectedSecret && internalSecretHeader !== expectedSecret)) {
      return NextResponse.json({ error: 'Unauthorized: Invalid internal token' }, { status: 401 });
    }

    const body = await req.json();
    const parseResult = dispatchSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'INVALID_PAYLOAD', details: parseResult.error.flatten() }, { status: 400 });
    }

    const { organization_id, thread_id, content, sender_type } = parseResult.data;

    const threadResponse = await fetchSupabaseRest('crm_threads', {
      searchParams: {
        organization_id: `eq.${organization_id}`,
        id: `eq.${thread_id}`,
        select: 'channel_id,customer_id,channel:crm_channels(channel_type,channel_external_id)',
        limit: 1
      }
    });

    if (!threadResponse.ok) {
      return NextResponse.json({ error: 'CRM_THREAD_LOOKUP_FAILED' }, { status: 422 });
    }

    const [thread] = await readRestJson<any[]>(threadResponse);
    if (!thread) {
      return NextResponse.json({ error: 'THREAD_NOT_FOUND' }, { status: 404 });
    }

    const channelType = thread.channel?.channel_type as string | undefined;
    const channelExternalId = thread.channel?.channel_external_id as string | undefined;
    
    let recipientId: string | undefined;
    if (channelType === 'facebook_page') {
      const identityRes = await fetchSupabaseRest('crm_channel_identities', {
        searchParams: {
           organization_id: `eq.${organization_id}`,
           customer_id: `eq.${thread.customer_id}`,
           channel_id: `eq.${thread.channel_id}`,
           select: 'external_user_id',
           limit: 1
        }
      });
      const [identity] = await readRestJson<any[]>(identityRes);
      recipientId = identity?.external_user_id;
    }

    const initialDeliveryStatus = channelType === 'livechat' ? 'sent' : 'queued';

    const insertResponse = await fetchSupabaseRest('crm_messages', {
      method: 'POST',
      prefer: 'return=representation',
      body: JSON.stringify({
        organization_id,
        thread_id,
        sender_type,
        content,
        delivery_status: initialDeliveryStatus
      })
    });

    if (!insertResponse.ok) {
      console.error('CRM_MESSAGE_INSERT_FAILED', await insertResponse.text());
      return NextResponse.json({ error: 'CRM_MESSAGE_INSERT_FAILED' }, { status: 422 });
    }

    const insertedMessages = await readRestJson<any[]>(insertResponse);
    const messageRow = insertedMessages[0];
    if (!messageRow) {
      return NextResponse.json({ error: 'CRM_MESSAGE_INSERT_EMPTY' }, { status: 422 });
    }

    await fetchSupabaseRest('crm_threads', {
      method: 'PATCH',
      searchParams: {
        organization_id: `eq.${organization_id}`,
        id: `eq.${thread_id}`
      },
      body: JSON.stringify({
        last_message_at: messageRow.created_at,
        unread_count: 0
      })
    });

    if (channelType === 'livechat') {
      return NextResponse.json({ success: true, message: { ...messageRow, delivery_status: 'sent' } });
    }

    if (channelType !== 'facebook_page') {
      await patchMessageStatus({
        organizationId: organization_id,
        messageId: messageRow.id,
        deliveryStatus: 'failed'
      });
      return NextResponse.json(
        { error: 'UNSUPPORTED_CHANNEL', message: { ...messageRow, delivery_status: 'failed' } },
        { status: 422 }
      );
    }

    if (!channelExternalId || !recipientId) {
      await patchMessageStatus({
        organizationId: organization_id,
        messageId: messageRow.id,
        deliveryStatus: 'failed'
      });
      return NextResponse.json(
        { error: 'MISSING_CHANNEL_RECIPIENT', message: { ...messageRow, delivery_status: 'failed' } },
        { status: 422 }
      );
    }

    const integrationKey = `facebook_page_${channelExternalId}`;
    const cpUrl = (process.env.NEXTJS_CONTROL_PLANE_BASE_URL || '').replace(/\/$/, '');
    if (!cpUrl) {
      await patchMessageStatus({
        organizationId: organization_id,
        messageId: messageRow.id,
        deliveryStatus: 'failed'
      });
      return NextResponse.json(
        { error: 'MISSING_CONTROL_PLANE_URL', message: { ...messageRow, delivery_status: 'failed' } },
        { status: 422 }
      );
    }

    const redeemRes = await fetch(`${cpUrl}/api/byok/redeem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${expectedSecret}`
      },
      body: JSON.stringify({
        organization_id,
        integration_key: integrationKey
      })
    });

    if (!redeemRes.ok) {
      await patchMessageStatus({
        organizationId: organization_id,
        messageId: messageRow.id,
        deliveryStatus: 'failed'
      });
      return NextResponse.json(
        { error: 'BYOK_REDEEM_FAILED', message: { ...messageRow, delivery_status: 'failed' } },
        { status: 422 }
      );
    }

    const redeemJson = await redeemRes.json().catch(() => null);
    const accessToken = redeemJson?.data?.access_token;
    if (!accessToken) {
      await patchMessageStatus({
        organizationId: organization_id,
        messageId: messageRow.id,
        deliveryStatus: 'failed'
      });
      return NextResponse.json(
        { error: 'BYOK_REDEEM_EMPTY', message: { ...messageRow, delivery_status: 'failed' } },
        { status: 422 }
      );
    }

    const fbRes = await fetch('https://graph.facebook.com/v19.0/me/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: accessToken,
        recipient: { id: recipientId },
        message: { text: content }
      })
    });

    if (!fbRes.ok) {
      const fbError = await fbRes.text().catch(() => 'unknown facebook error');
      await patchMessageStatus({
        organizationId: organization_id,
        messageId: messageRow.id,
        deliveryStatus: 'failed'
      });
      return NextResponse.json(
        { error: 'FB_SEND_FAILED', details: fbError, message: { ...messageRow, delivery_status: 'failed' } },
        { status: 422 }
      );
    }

    await patchMessageStatus({
      organizationId: organization_id,
      messageId: messageRow.id,
      deliveryStatus: 'sent'
    });

    return NextResponse.json({ success: true, message: { ...messageRow, delivery_status: 'sent' } });
  } catch (error) {
    console.error('Dispatch error:', error);
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}
