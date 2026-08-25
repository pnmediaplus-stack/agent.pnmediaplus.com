import { NextResponse } from 'next/server';
import { fetchSupabaseRest } from '@/lib/crm-api';
import { verifyUiAuth } from '@/lib/ui-auth-guard';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    // 1. Verify Authentication to prevent unauthorized injection
    const auth = await verifyUiAuth(req);
    if (!auth.ok) {
      return auth.response;
    }

    // 2. Prevent usage in production if needed, but since it's auth-guarded it's safer.
    // We will still restrict URL to prevent SSRF.
    const { message, n8nWebhookUrl } = await req.json();

    // 3. SSRF Protection: Strict URL Validation
    const allowedHost = process.env.N8N_WEBHOOK_HOSTNAME || 'n8n.pnmediaplus.com';
    const targetUrl = n8nWebhookUrl || 'http://localhost:5678/webhook-test/e43cb6ea-c076-40d8-b398-29ce59c47d1f';
    
    let parsedUrl;
    try {
      parsedUrl = new URL(targetUrl);
    } catch (e) {
      return NextResponse.json({ error: 'SSRF Protection: Invalid URL format' }, { status: 400 });
    }

    const isLocalhost = parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1';
    const isAllowedHost = parsedUrl.hostname === allowedHost;
    const isAllowedPort = parsedUrl.port === '' || parsedUrl.port === '5678' || parsedUrl.port === '80' || parsedUrl.port === '443';

    if (!(isLocalhost || isAllowedHost) || !isAllowedPort || (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:')) {
      return NextResponse.json({ error: 'SSRF Protection: Hostname or Protocol not allowed' }, { status: 403 });
    }
    
    // Hardcoded dummy thread IDs
    const organization_id = '8289488a-b255-4cb6-9bff-c9d2e71af160';
    const thread_id = '33333333-3333-4333-8333-333333333333';
    const channel_id = '11111111-1111-4111-8111-111111111111';
    const customer_id = '22222222-2222-4222-8222-222222222222';
    const sender_id = 'test_cust_01';

    // 4. Auto-provision dummy records so the Dispatch API doesn't return 404
    await fetchSupabaseRest('crm_channels', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates',
      body: JSON.stringify({ id: channel_id, organization_id, channel_type: 'livechat', channel_name: 'Simulator', channel_external_id: 'simulator' })
    });
    
    await fetchSupabaseRest('crm_customers', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates',
      body: JSON.stringify({ id: customer_id, organization_id, full_name: 'Simulator Customer' })
    });
    
    await fetchSupabaseRest('crm_threads', {
      method: 'POST',
      prefer: 'resolution=merge-duplicates',
      body: JSON.stringify({ id: thread_id, organization_id, channel_id, customer_id, status: 'bot_handling' })
    });

    // 5. Insert customer message into DB so it shows up in UI immediately
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

    // 6. Trigger n8n webhook
    try {
      const n8nRes = await fetch(parsedUrl.toString(), {
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
    } catch (err: any) {
      console.error('Cannot reach N8N:', err);
      return NextResponse.json({ error: 'Cannot reach N8N: ' + err.message }, { status: 502 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
