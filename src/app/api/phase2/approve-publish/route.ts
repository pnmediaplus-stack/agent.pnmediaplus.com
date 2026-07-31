import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyUiAuth } from '@/lib/ui-auth-guard';

const ApprovePublishSchema = z.object({
  content_item_id: z.string().uuid('Invalid content item ID'),
});

export async function POST(req: Request) {
  // 1. Check UI Auth (Requires valid Portal Session)
  const guard = await verifyUiAuth(req, ApprovePublishSchema);
  
  if (!guard.ok) {
    return guard.response;
  }

  const { payload, logAudit, user } = guard;
  const { content_item_id } = payload;

  try {
    // 2. Load Supabase Service Role
    const supabaseUrl = process.env.SUPABASE_URL?.trim() || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';

    if (!supabaseUrl || !supabaseKey) {
      await logAudit('approve_publish', 'Supabase credentials missing', { content_item_id });
      return NextResponse.json({ error: 'MISSING_CONFIGURATION', message: 'Supabase credentials missing' }, { status: 500 });
    }

    // 3. Fetch Content Item
    const contentRes = await fetch(`${supabaseUrl}/rest/v1/phase2_content_items?id=eq.${content_item_id}`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    });
    const contentData = await contentRes.json();
    
    if (!contentData || contentData.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'Content item not found' }, { status: 404 });
    }

    const content = contentData[0];
    if (content.state !== 'QA_passed' && content.state !== 'scheduled') {
      return NextResponse.json({ error: 'INVALID_STATE', message: 'Content must be in QA_passed or scheduled state to publish' }, { status: 400 });
    }

    // 4. Fetch Assets
    const assetsRes = await fetch(`${supabaseUrl}/rest/v1/phase2_assets?content_item_id=eq.${content_item_id}`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    });
    const assets = await assetsRes.json();

    const captionAsset = assets.find((a: any) => a.asset_type === 'caption_output');
    const visualAsset = assets.find((a: any) => a.asset_type === 'visual_asset');

    if (!captionAsset) {
      return NextResponse.json({ error: 'MISSING_ASSET', message: 'Missing caption asset' }, { status: 400 });
    }

    // Decode Base64 URI
    const extractBase64Data = (uri: string) => {
      if (!uri) return '';
      const match = uri.match(/^data:.*?;base64,(.*)$/);
      if (match && match[1]) {
        return Buffer.from(match[1], 'base64').toString('utf-8');
      }
      return uri;
    };

    const captionText = extractBase64Data(captionAsset.asset_uri);
    const visualUri = visualAsset ? extractBase64Data(visualAsset.asset_uri) : '';

    // 5. Read Telegram Config
    const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

    if (!botToken || !chatId) {
      await logAudit('approve_publish', 'Telegram credentials missing', { content_item_id });
      return NextResponse.json({ error: 'MISSING_CONFIGURATION', message: 'Telegram credentials missing' }, { status: 500 });
    }

    // 6. Post to Telegram
    const messageText = `🚀 𝐁𝐚̀𝐢 𝐯𝐢𝐞̂́𝐭 𝐦𝐨̛́𝐢: ${content.title}\n\n${captionText}\n\n🎨 Hình ảnh đính kèm: ${visualUri || 'Không có'}`;
    const tgUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: messageText, disable_web_page_preview: false })
    });

    const data = await response.json();

    if (!data.ok) {
      await logAudit('approve_publish', 'Telegram API returned error', { content_item_id, tg_error: data.description });
      return NextResponse.json({ error: 'PUBLISH_FAILED', message: data.description }, { status: 500 });
    }

    // 7. Update Database
    const messageId = data.result.message_id;
    const chatStr = chatId.toString().replace('-100', '');
    const publishUrl = `https://t.me/c/${chatStr}/${messageId}`;

    // Insert Publish Record
    await fetch(`${supabaseUrl}/rest/v1/phase2_publish_records`, {
      method: 'POST',
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content_item_id: content_item_id,
        channel: 'telegram',
        platform_asset_id: messageId.toString(),
        publish_url: publishUrl
      })
    });

    // Update Content State to published
    await fetch(`${supabaseUrl}/rest/v1/phase2_content_items?id=eq.${content_item_id}`, {
      method: 'PATCH',
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ state: 'published', published_at: new Date().toISOString() })
    });

    await logAudit('approve_publish', 'Published successfully', { content_item_id, publishUrl });
    
    return NextResponse.json({ status: 'OK', publish_url: publishUrl });

  } catch (error: any) {
    console.error("Approve Publish Error:", error);
    await logAudit('approve_publish', 'Internal execution error', { content_item_id, error_message: error.message });
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: 'Internal server error occurred during publish' }, { status: 500 });
  }
}
