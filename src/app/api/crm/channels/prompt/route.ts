import { NextResponse } from 'next/server';
import { requireCrmRouteContext, fetchSupabaseRest, readRestJson } from '@/lib/crm-api';

export async function GET(request: Request) {
  const auth = await requireCrmRouteContext(request);
  if (!auth.ok) return auth.response;

  try {
    const res = await fetchSupabaseRest('crm_channels', {
      searchParams: {
        organization_id: `eq.${auth.context.organizationId}`,
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
        id: `eq.${channel_id}`,
        organization_id: `eq.${auth.context.organizationId}`
      },
      headers: {
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ bot_system_prompt })
    });
    
    if (!res.ok) {
       const text = await res.text();
       throw new Error(`Cập nhật thất bại: ${text}`);
    }

    const updatedRows = await readRestJson(res);
    if (!updatedRows || updatedRows.length === 0) {
       return NextResponse.json({ error: "Không tìm thấy kênh hoặc không có quyền" }, { status: 404 });
    }

    return NextResponse.json({ success: true, updated: updatedRows.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
