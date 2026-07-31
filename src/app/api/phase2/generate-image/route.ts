import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyN8nWebhook } from '@/lib/n8n-webhook-guard';

const GenerateImagePayloadSchema = z.object({
  prompt: z.string().min(1, 'Prompt cannot be empty'),
});

export async function POST(req: Request) {
  // 1. Central Guard
  const guard = await verifyN8nWebhook(req, 'generate_image_call', GenerateImagePayloadSchema);
  
  if (!guard.ok) {
    return guard.response;
  }
  
  if (guard.duplicate) {
    return guard.response;
  }

  const { payload, logCompletion } = guard;
  const { prompt } = payload;

  // 2. Read Configuration
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.IMAGE_GENERATOR_MODEL?.trim() || 'dall-e-3';

  if (!apiKey) {
    const errorMsg = 'OPENAI_API_KEY must be set in .env.local';
    await logCompletion('FAILED', errorMsg);
    return NextResponse.json({ error: 'MISSING_CONFIGURATION', message: errorMsg }, { status: 500 });
  }

  // 3. AI Prompt System (Optimize for DALL-E)
  const enhancedPrompt = `Professional high-quality promotional image for social media marketing. Style: Modern, vibrant, professional. Subject: ${prompt}. No text in the image.`;

  // 4. Call OpenAI API
  const openAiUrl = 'https://api.openai.com/v1/images/generations';
  
  try {
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
        quality: "standard"
      })
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error?.message || 'OpenAI generation failed';
      await logCompletion('FAILED', errorMsg, { upstream_status: response.status });
      return NextResponse.json({ error: 'GENERATION_FAILED', message: errorMsg }, { status: 502 });
    }

    if (!data.data || !data.data[0] || !data.data[0].url) {
      const errorMsg = 'No image URL returned from OpenAI';
      await logCompletion('FAILED', errorMsg);
      return NextResponse.json({ error: 'INVALID_UPSTREAM_RESPONSE', message: errorMsg }, { status: 502 });
    }

    // Success
    const imageUrl = data.data[0].url;
    await logCompletion('ACCEPTED', 'Image successfully generated', { model });
    return NextResponse.json({ success: true, url: imageUrl }, { status: 200 });

  } catch (error: any) {
    const errorMsg = error.message || 'Network error connecting to OpenAI';
    await logCompletion('FAILED', errorMsg);
    return NextResponse.json({ error: 'NETWORK_ERROR', message: errorMsg }, { status: 500 });
  }
}
