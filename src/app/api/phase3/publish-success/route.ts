export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const expectedSecret = process.env.CONTROL_PLANE_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'FORBIDDEN_ACTOR', message: 'Invalid or missing CONTROL_PLANE_SECRET' }, { status: 403 });
    }

    const body = await req.json();
    const { contentItemId, channel, externalId, externalUrl } = body;

    if (!contentItemId || !channel || !externalId) {
      return NextResponse.json({ error: 'BAD_REQUEST', message: 'Missing required fields' }, { status: 400 });
    }

    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'MISSING_CONFIGURATION', message: 'Credentials missing' }, { status: 500 });
    }

    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json'
    };

    // 1. Update State to published
    const updateRes = await fetch(`${supabaseUrl}/rest/v1/phase2_content_items?id=eq.${contentItemId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ state: 'published', published_at: new Date().toISOString() })
    });

    if (!updateRes.ok) {
      return NextResponse.json({ error: 'DB_ERROR', message: `Update state failed: ${await updateRes.text()}` }, { status: 500 });
    }

    // 2. Create Publish Record via public view
    const publishPayload = {
      content_item_id: contentItemId,
      channel: channel,
      external_id: externalId,
      external_url: externalUrl || '',
      status: 'published',
      published_at: new Date().toISOString()
    };

    const publishRes = await fetch(`${supabaseUrl}/rest/v1/phase2_publish_records`, {
      method: 'POST',
      headers,
      body: JSON.stringify(publishPayload)
    });

    if (!publishRes.ok) {
      return NextResponse.json({ error: 'DB_ERROR', message: `Insert publish record failed: ${await publishRes.text()}` }, { status: 500 });
    }

    return NextResponse.json({ status: 'OK', message: 'Publish success recorded' });

  } catch (error: any) {
    console.error("Publish Success Error:", error);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: error.message }, { status: 500 });
  }
}
