import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization') || request.headers.get('x-cron-secret');
  const secret = authHeader?.replace('Bearer ', '');
  
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Supabase credentials missing' }, { status: 500 });
  }

  const dateStr = new Date().toLocaleDateString('vi-VN');
  // Theo đúng schema của pn_os_ai_department
  const taskPayload = {
    title: `Bài đăng Facebook tự động ngày ${dateStr}`,
    intent_type: 'create_content',
    state: 'NOT_STARTED',
    priority: 50,
    metadata: {
      source: 'cron_auto_task',
      generated_at: new Date().toISOString(),
      platform: 'facebook'
    },
    requester_external_ref: 'system_cron'
  };

  try {
    const res = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/tasks`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
        'Content-Profile': 'pn_os_ai_department'
      },
      body: JSON.stringify(taskPayload)
    });

    if (!res.ok) {
      const errorText = await res.text();
      return NextResponse.json({ error: 'Failed to create task', details: errorText }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, task: Array.isArray(data) ? data[0] : data });
  } catch (err) {
    return NextResponse.json({ error: 'Internal error', details: String(err) }, { status: 500 });
  }
}
