import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyN8nWebhook } from '@/lib/n8n-webhook-guard';
import { dbInsertChatMessage } from '@/lib/governance-api';

export const dynamic = 'force-dynamic';

const PublishErrorPayloadSchema = z.object({
  organizationId: z.string().uuid(),
  contentItemId: z.string().uuid(),
  errorMessage: z.string(),
  threadId: z.string().optional(),
});

export async function POST(req: Request) {
  // 1. Central Guard
  const guard = await verifyN8nWebhook(req, 'publish_error_call', PublishErrorPayloadSchema);
  
  if (!guard.ok) {
    return guard.response;
  }
  
  if (guard.duplicate) {
    return guard.response;
  }

  const { payload, logCompletion } = guard;
  const { organizationId, contentItemId, errorMessage, threadId } = payload;

  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !supabaseKey) {
    await logCompletion('FAILED', 'Credentials missing');
    return NextResponse.json({ error: 'MISSING_CONFIGURATION', message: 'Credentials missing' }, { status: 500 });
  }

  try {
    // Note: We don't have a phase076_fail_facebook_publish RPC, so we just notify the user in the UI.
    await logCompletion('ACCEPTED', 'Successfully recorded publish error', { contentItemId });

    if (threadId) {
      let friendlyError = errorMessage;
      if (errorMessage.includes('PHASE2_FACEBOOK_PUBLISH_ALREADY_CLAIMED')) {
        friendlyError = 'Bài viết này đang trong tiến trình đăng tải bị kẹt (pending lock). Để bảo vệ Fanpage không bị đăng đúp, hệ thống đã khóa bài viết này. Vui lòng tạo bài viết mới!';
      } else if (errorMessage.includes('url should represent a valid URL')) {
        friendlyError = 'Lỗi đường dẫn ảnh không hợp lệ từ Facebook.';
      }

      await dbInsertChatMessage(organizationId, {
        threadId: threadId,
        sender: 'system',
        body: `❌ **Đăng bài thất bại!**\n\nNội dung: **${contentItemId}**\nLỗi từ hệ thống n8n: *${friendlyError}*`,
        intentType: 'notify_publish_error'
      }).catch(err => console.error("Failed to insert error chat message:", err));
    }

    return NextResponse.json({ 
      status: 'OK', 
      message: 'Publish error recorded' 
    });

  } catch (error: any) {
    const errorMsg = error.message || 'Unknown error';
    await logCompletion('FAILED', errorMsg);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: errorMsg }, { status: 500 });
  }
}
