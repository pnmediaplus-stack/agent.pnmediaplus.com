import { NextResponse } from 'next/server';
import { fetchSupabaseRest } from '@/lib/crm-api';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { message, n8nWebhookUrl } = await req.json();
    
    // Hardcoded dummy thread IDs
    const organization_id = '8289488a-b255-4cb6-9bff-c9d2e71af160';
    const thread_id = '33333333-3333-3333-3333-333333333333';
    const channel_id = '11111111-1111-1111-1111-111111111111';
    const customer_id = '22222222-2222-2222-2222-222222222222';
    const sender_id = 'test_cust_01';

    // 1. Insert customer message into DB so it shows up in UI immediately
    await fetchSupabaseRest('crm_messages', {
      method: 'POST',
      body: JSON.stringify({
        organization_id,
        thread_id,
        sender_type: 'customer',
        content: message,
        delivery_status: 'delivered'
      })
    });

    // 2. Trigger n8n webhook
    // Default to localhost if not provided, allowing user to paste test URL in UI
    const targetUrl = n8nWebhookUrl || 'http://localhost:5678/webhook-test/e43cb6ea-c076-40d8-b398-29ce59c47d1f';
    
    try {
      const n8nRes = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id,
          channel_id,
          customer_id,
          thread_id,
          message,
          sender_id
        })
      });
      
      if (!n8nRes.ok) {
        console.error('N8N Trigger Failed:', await n8nRes.text());
        return NextResponse.json({ error: 'N8N returned error' }, { status: 502 });
      }
    } catch (err) {
      console.error('Cannot reach N8N:', err);
      return NextResponse.json({ error: 'Cannot reach N8N' }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
