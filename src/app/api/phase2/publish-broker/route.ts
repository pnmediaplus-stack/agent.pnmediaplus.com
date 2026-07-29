import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // 1. Kiểm tra Authority & Gated Access (Bắt buộc phải có CONTROL_PLANE_SECRET)
    const authHeader = req.headers.get('authorization');
    const expectedSecret = process.env.CONTROL_PLANE_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ 
        error: 'FORBIDDEN_ACTOR', 
        message: 'Invalid or missing CONTROL_PLANE_SECRET' 
      }, { status: 403 });
    }

    // 2. Parse payload từ N8N
    const body = await req.json();
    const { title, research_text, caption_text, visual_uri } = body;

    if (!title || !caption_text) {
      return NextResponse.json({ 
        error: 'INVALID_PAYLOAD', 
        message: 'Missing required fields for publishing' 
      }, { status: 400 });
    }

    // 3. Đọc cấu hình Nền tảng (Fail-Closed nếu chưa cấu hình)
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return NextResponse.json({ 
        error: 'MISSING_CONFIGURATION', 
        message: 'TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set in .env.local' 
      }, { status: 500 });
    }

    // 4. Định dạng nội dung bài đăng
    // Sử dụng plain text để tránh lỗi Parse Mode do AI sinh ký tự đặc biệt
    const messageText = `🚀 𝐁𝐚̀𝐢 𝐯𝐢𝐞̂́𝐭 𝐦𝐨̛́𝐢: ${title}\n\n${caption_text}\n\n🎨 Hình ảnh đính kèm: ${visual_uri || 'Không có'}`;

    // 5. Gửi yêu cầu lên Telegram API
    const tgUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageText,
        disable_web_page_preview: false
      })
    });

    const data = await response.json();

    if (!data.ok) {
      console.error("Telegram API Error:", data);
      return NextResponse.json({ 
        error: 'PUBLISH_FAILED', 
        message: data.description 
      }, { status: 500 });
    }

    // 6. Xây dựng Publish URL và lưu Audit Log
    const messageId = data.result.message_id;
    // URL tĩnh của Telegram: https://t.me/c/chatId/messageId (nếu chat riêng) hoặc username/messageId
    const chatStr = chatId.toString().replace('-100', '');
    const publishUrl = `https://t.me/c/${chatStr}/${messageId}`;

    return NextResponse.json({ 
      status: 'OK', 
      channel: 'telegram',
      platform_asset_id: messageId.toString(),
      publish_url: publishUrl
    });

  } catch (error: any) {
    console.error("Publish Broker Error:", error);
    return NextResponse.json({ 
      error: 'INTERNAL_ERROR', 
      message: error.message 
    }, { status: 500 });
  }
}
