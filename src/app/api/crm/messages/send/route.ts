import { NextResponse } from 'next/server';
import { verifyUiAuth } from '@/lib/ui-auth-guard';

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const auth = await verifyUiAuth(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const { threadId, content, organizationId } = body;

    if (!threadId || !content) return new NextResponse('Missing fields', { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // 1. Insert into DB so UI updates via Realtime
    const res = await fetch(`${supabaseUrl}/rest/v1/crm_messages`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey!,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        organization_id: organizationId,
        thread_id: threadId,
        sender_type: 'human',
        content,
        delivery_status: 'queued'
      })
    });

    if (!res.ok) throw new Error(await res.text());
    
    const messages = await res.json();
    const message = messages[0];

    // 2. Mock sending to Facebook API (or triggering n8n outbound webhook)
    setTimeout(async () => {
      await fetch(`${supabaseUrl}/rest/v1/crm_messages?id=eq.${message.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': serviceRoleKey!,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ delivery_status: 'sent' })
      });
    }, 1000);

    return NextResponse.json(message);
  } catch (error: any) {
    console.error('Error sending message:', error);
    return new NextResponse(error.message, { status: 500 });
  }
}

