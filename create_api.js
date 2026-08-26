const fs = require('fs');
const content = import { NextResponse } from 'next/server';
import { requireCrmRouteContext, fetchSupabaseRest, readRestJson } from '@/lib/crm-api';

export async function GET(request: Request) {
  const auth = await requireCrmRouteContext(request);
  if (!auth.ok) return auth.response;

  try {
    const res = await fetchSupabaseRest('crm_channels', {
      searchParams: {
        organization_id: \q.\\,
        select: 'id,channel_name,bot_system_prompt'
      }
    });
    const channels = await readRestJson(res);
    return NextResponse.json(channels);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const auth = await requireCrmRouteContext(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { channel_id, bot_system_prompt } = body;

    const res = await fetchSupabaseRest('crm_channels', {
      method: 'PATCH',
      searchParams: {
        id: \q.\\,
        organization_id: \q.\\
      },
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ bot_system_prompt })
    });
    
    if (!res.ok) {
       const text = await res.text();
       throw new Error(\Cập nhật thất bại: \\);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
;
fs.writeFileSync('d:/Projects/agent.pnmediaplus.com/src/app/api/crm/channels/prompt/route.ts', content);
console.log('API Created');
