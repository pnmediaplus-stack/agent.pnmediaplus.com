import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // 1. Gated Access (Bắt buộc phải có CONTROL_PLANE_SECRET)
    const authHeader = req.headers.get('authorization');
    const expectedSecret = process.env.CONTROL_PLANE_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'FORBIDDEN_ACTOR', message: 'Invalid or missing CONTROL_PLANE_SECRET' }, { status: 403 });
    }

    // 2. Parse payload từ N8N
    const body = await req.json();
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json({ error: 'INVALID_PAYLOAD', message: 'Missing required field: prompt' }, { status: 400 });
    }

    // 3. Đọc cấu hình Nền tảng (Fail-Closed)
    const apiKey = process.env.OPENAI_API_KEY;
    // Dùng biến môi trường để dễ cấu hình model (ví dụ: dall-e-3, dall-e-2)
    const model = process.env.IMAGE_GENERATOR_MODEL || 'dall-e-3';

    if (!apiKey) {
      return NextResponse.json({ error: 'MISSING_CONFIGURATION', message: 'OPENAI_API_KEY must be set in .env.local' }, { status: 500 });
    }

    // 4. Gắn AI Prompt System (Tối ưu Prompt)
    // DALL-E 3 hoạt động tốt nhất với prompt chi tiết, ta có thể tự động thêm một số từ khoá chất lượng.
    const enhancedPrompt = `Professional high-quality promotional image for social media marketing. Style: Modern, vibrant, professional. Subject: ${prompt}. No text in the image.`;

    // 5. Gửi yêu cầu lên OpenAI API
    const openAiUrl = 'https://api.openai.com/v1/images/generations';
    const response = await fetch(openAiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        prompt: enhancedPrompt,
        n: 1,
        size: "1024x1024",
        quality: "standard" // Dùng hd nếu cần chất lượng cực cao nhưng tốn kém hơn
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI API Error:", data);
      return NextResponse.json({ error: 'GENERATION_FAILED', message: data.error?.message || 'Unknown OpenAI error' }, { status: response.status });
    }

    // 6. Trả URL ảnh về cho N8N
    const imageUrl = data.data[0].url;

    return NextResponse.json({ 
      status: 'OK', 
      visual_uri: imageUrl
    });

  } catch (error: any) {
    console.error("Visual Broker Error:", error);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: error.message }, { status: 500 });
  }
}
