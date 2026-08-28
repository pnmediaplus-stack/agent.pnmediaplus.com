import { NextResponse } from 'next/server';
import { requireCrmRouteContext, fetchSupabaseRest, readRestJson } from '@/lib/crm-api';

export async function GET(request: Request) {
  const auth = await requireCrmRouteContext(request);
  if (!auth.ok) return auth.response;

  try {
    const res = await fetchSupabaseRest('crm_tenant_tags', {
      searchParams: {
        organization_id: `eq.${auth.context.organizationId}`,
        order: 'created_at.desc'
      }
    });
    return NextResponse.json(await readRestJson(res));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireCrmRouteContext(request);
  if (!auth.ok) return auth.response;

  try {
    const { tag_name, color } = await request.json();
    if (!tag_name) return NextResponse.json({ error: 'Missing tag_name' }, { status: 400 });

    const payload = {
      organization_id: auth.context.organizationId,
      tag_name: tag_name.trim(),
      color: color || '#3B82F6'
    };

    const res = await fetchSupabaseRest('crm_tenant_tags', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Prefer': 'return=representation' }
    });
    
    return NextResponse.json(await readRestJson(res));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireCrmRouteContext(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    await fetchSupabaseRest('crm_tenant_tags', {
      method: 'DELETE',
      searchParams: {
        id: `eq.${id}`,
        organization_id: `eq.${auth.context.organizationId}`
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
