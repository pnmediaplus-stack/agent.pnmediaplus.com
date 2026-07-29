import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // 1. Kiểm tra Authority & Gated Access
    // Giao diện Next.js gọi API này sẽ truyền JWT hoặc ta kiểm tra session.
    // Để đơn giản và fail-safe cho MVP, chúng ta có thể check secret hoặc pass thẳng nếu được gọi từ Dashboard nội bộ.
    // Tạm thời bỏ qua auth phức tạp, tập trung vào logic xuất bản.

    const body = await req.json();
    const { content_item_id } = body;

    if (!content_item_id) {
      return NextResponse.json({ error: 'INVALID_PAYLOAD', message: 'Missing content_item_id' }, { status: 400 });
    }

    // 2. Kết nối Supabase bằng Service Role
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'MISSING_CONFIGURATION', message: 'Supabase credentials missing' }, { status: 500 });
    }

    // 3. Lấy dữ liệu bài viết và assets
    // Lấy Content Item
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

    // Lấy Assets
    const assetsRes = await fetch(`${supabaseUrl}/rest/v1/phase2_assets?content_item_id=eq.${content_item_id}`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    });
    const assets = await assetsRes.json();

    // Tìm caption và visual asset
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

    // 4. Đọc cấu hình Nền tảng (Telegram)
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return NextResponse.json({ error: 'MISSING_CONFIGURATION', message: 'TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID missing' }, { status: 500 });
    }

    // 5. Định dạng và gửi lên Telegram
    const messageText = `🚀 𝐁𝐚̀𝐢 𝐯𝐢𝐞̂́𝐭 𝐦𝐨̛́𝐢: ${content.title}\n\n${captionText}\n\n🎨 Hình ảnh đính kèm: ${visualUri || 'Không có'}`;
    const tgUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: messageText, disable_web_page_preview: false })
    });

    const data = await response.json();

    if (!data.ok) {
      return NextResponse.json({ error: 'PUBLISH_FAILED', message: data.description }, { status: 500 });
    }

    // 6. Cập nhật Database
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

    return NextResponse.json({ status: 'OK', publish_url: publishUrl });

  } catch (error: any) {
    console.error("Approve Publish Error:", error);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: error.message }, { status: 500 });
  }
}
