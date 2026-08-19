import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyN8nWebhook } from '@/lib/n8n-webhook-guard';
import { dbInsertChatMessage } from '@/lib/governance-api';

export const dynamic = 'force-dynamic';

const PublishSuccessPayloadSchema = z.object({
  organizationId: z.string().uuid(),
  contentItemId: z.string().uuid(),
  channel: z.string().min(1),
  externalId: z.string().min(1),
  externalUrl: z.string().url().optional().or(z.literal('')),
  threadId: z.string().uuid().optional(),
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
  const { organizationId, contentItemId, channel, externalId, externalUrl } = payload;

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
    // Keep the public view read-only. The RPC atomically enforces tenant scope,
    // lifecycle state, and publish replay protection.
    const recordRes = await fetch(`${supabaseUrl}/rest/v1/rpc/phase076_record_facebook_publish`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        p_organization_id: organizationId,
        p_content_item_id: contentItemId,
        p_channel: channel,
        p_external_id: externalId,
        p_external_url: externalUrl || null
      })
    });

    if (!recordRes.ok) {
      const errorMsg = await recordRes.text();
      await logCompletion('FAILED', `Insert publish record failed: ${errorMsg}`);
      return NextResponse.json({ error: 'DB_ERROR', message: `Insert publish record failed: ${errorMsg}` }, { status: 500 });
    }

    await logCompletion('ACCEPTED', 'Successfully recorded publish', { contentItemId, externalId });

    if (payload.threadId) {
      const postLink = externalUrl || (channel === 'facebook' && externalId.includes('_') ? `https://facebook.com/${externalId}` : `https://facebook.com/${externalId}`);
      await dbInsertChatMessage(organizationId, {
        threadId: payload.threadId,
        sender: 'system',
        body: `🎉 **Đăng bài thành công!**\n\nBài viết đã được xuất bản lên kênh **${channel}**.\n\n👉 [Xem bài viết trực tiếp tại đây](${postLink})`,
        intentType: 'notify_publish_success'
      }).catch(err => console.error("Failed to insert success chat message:", err));
    }

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
