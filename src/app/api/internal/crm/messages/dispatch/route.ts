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

export async function POST(req: Request) {
  try {
    // Basic Internal Auth check
    const authHeader = req.headers.get('Authorization') || '';
    const bearerToken = authHeader.replace('Bearer ', '').trim();
    const expectedSecret = process.env.N8N_API_KEY || process.env.CONTROL_PLANE_SECRET;

    if (!expectedSecret || bearerToken !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized: Invalid internal token' }, { status: 401 });
    }

    const body = await req.json();
    const parseResult = dispatchSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json({ error: 'INVALID_PAYLOAD', details: parseResult.error }, { status: 400 });
    }

    const { organization_id, thread_id, content, sender_type } = parseResult.data;

    // 1. Get Thread & Channel details
    const threadResponse = await fetchSupabaseRest('crm_threads', {
      searchParams: {
        organization_id: \q.\\,
        id: \q.\\,
        select: 'channel_id,customer_id,customer:crm_customers(platform_customer_id),channel:crm_channels(channel_type,channel_external_id)',
        limit: 1
      }
    });

    if (!threadResponse.ok) {
      return NextResponse.json({ error: 'CRM_THREAD_LOOKUP_FAILED' }, { status: 502 });
    }

    const [thread] = await readRestJson<any[]>(threadResponse);
    if (!thread) {
      return NextResponse.json({ error: 'THREAD_NOT_FOUND' }, { status: 404 });
    }

    // 2. Insert Message into DB
    const insertResponse = await fetchSupabaseRest('crm_messages', {
      method: 'POST',
      prefer: 'return=representation',
      body: JSON.stringify({
        organization_id,
        thread_id,
        sender_type,
        content,
        delivery_status: 'sent'
      })
    });

    let messageRow = null;
    if (insertResponse.ok) {
      const inserted = await readRestJson<any[]>(insertResponse);
      messageRow = inserted[0];
      
      // Update thread last_message_at
      await fetchSupabaseRest('crm_threads', {
        method: 'PATCH',
        searchParams: { organization_id: \q.\\, id: \q.\\ },
        body: JSON.stringify({ last_message_at: messageRow.created_at, unread_count: 0 })
      });
    }

    // 3. Dispatch to specific channel API
    const channelType = thread.channel?.channel_type;
    const channelExternalId = thread.channel?.channel_external_id;
    const recipientId = thread.customer?.platform_customer_id;

    if (channelType === 'facebook') {
      const integrationKey = \acebook_page_\\;
      const cpUrl = (process.env.NEXTJS_CONTROL_PLANE_BASE_URL || '').replace(/\/$/, '');
      
      // Redeem BYOK
      const redeemRes = await fetch(\\/api/byok/redeem\, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \Bearer \\
        },
        body: JSON.stringify({ organization_id, integration_key: integrationKey })
      });

      if (redeemRes.ok) {
        const { data: { access_token } } = await redeemRes.json();
        
        // Call Graph API
        const fbRes = await fetch('https://graph.facebook.com/v19.0/me/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            access_token,
            recipient: { id: recipientId },
            message: { text: content }
          })
        });

        if (!fbRes.ok) {
          console.error('FB_SEND_FAILED', await fbRes.text());
        }
      } else {
        console.error('BYOK_REDEEM_FAILED', await redeemRes.text());
      }
    } else if (channelType === 'livechat') {
      // For livechat, saving to DB is enough, Supabase Realtime will sync to frontend widget
      console.log('Livechat message dispatched via DB');
    } else {
      console.warn('Unsupported channel type for dispatch:', channelType);
    }

    return NextResponse.json({ success: true, message: messageRow });
  } catch (error) {
    console.error('Dispatch error:', error);
    return NextResponse.json({ error: 'INTERNAL_SERVER_ERROR' }, { status: 500 });
  }
}
