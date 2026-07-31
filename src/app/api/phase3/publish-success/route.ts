import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyN8nWebhook } from '@/lib/n8n-webhook-guard';

export const dynamic = 'force-dynamic';

const PublishSuccessPayloadSchema = z.object({
  contentItemId: z.string().uuid(),
  channel: z.string().min(1),
  externalId: z.string().min(1),
  externalUrl: z.string().url().optional().or(z.literal('')),
});

export async function POST(req: Request) {
  // 1. Central Guard
  const guard = await verifyN8nWebhook(req, 'publish_success_call', PublishSuccessPayloadSchema);
  
  if (!guard.ok) {
    return guard.response;
  }
  
  if (guard.duplicate) {
    return guard.response;
  }

  const { payload, logCompletion } = guard;
  const { contentItemId, channel, externalId, externalUrl } = payload;

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !supabaseKey) {
    await logCompletion('FAILED', 'Credentials missing');
    return NextResponse.json({ error: 'MISSING_CONFIGURATION', message: 'Credentials missing' }, { status: 500 });
  }

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json'
  };

  try {
    // 2. Update State to published
    const updateRes = await fetch(`${supabaseUrl}/rest/v1/phase2_content_items?id=eq.${contentItemId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ state: 'published', published_at: new Date().toISOString() })
    });

    if (!updateRes.ok) {
      const errorMsg = await updateRes.text();
      await logCompletion('FAILED', `Update state failed: ${errorMsg}`);
      return NextResponse.json({ error: 'DB_ERROR', message: `Update state failed: ${errorMsg}` }, { status: 500 });
    }

    // 3. Create Publish Record via public view
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
      const errorMsg = await publishRes.text();
      await logCompletion('FAILED', `Insert publish record failed: ${errorMsg}`);
      return NextResponse.json({ error: 'DB_ERROR', message: `Insert publish record failed: ${errorMsg}` }, { status: 500 });
    }

    await logCompletion('ACCEPTED', 'Successfully recorded publish', { contentItemId, externalId });
    return NextResponse.json({ 
      status: 'OK', 
      message: 'Publish success recorded' 
    });

  } catch (error: any) {
    const errorMsg = error.message || 'Unknown error';
    await logCompletion('FAILED', errorMsg);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: errorMsg }, { status: 500 });
  }
}
