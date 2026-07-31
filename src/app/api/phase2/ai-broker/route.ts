import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyN8nWebhook } from '@/lib/n8n-webhook-guard';

const AiBrokerPayloadSchema = z.object({
  model: z.string(),
  messages: z.array(z.any()).min(1),
  temperature: z.number().optional(),
}).passthrough();

export async function POST(request: Request) {
  // 1. Central Guard: Auth, Boundary, Idempotency, Audit
  const guard = await verifyN8nWebhook(request, 'broker_llm_call', AiBrokerPayloadSchema);
  
  if (!guard.ok) {
    return guard.response;
  }
  
  if (guard.duplicate) {
    return guard.response;
  }

  const { payload, logCompletion } = guard;

  // 2. Read OpenAI Key (Environment Adapter)
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    const errorMsg = 'OPENAI_API_KEY is missing on Broker';
    await logCompletion('FAILED', errorMsg);
    return NextResponse.json({ error: 'MISSING_CONFIGURATION', message: errorMsg }, { status: 500 });
  }
  
  // 3. Forward to OpenAI
  const openaiUrl = (process.env.BYOK_OPENAI_CHAT_COMPLETIONS_URL || 'https://api.openai.com/v1/chat/completions').trim();
  
  try {
    const response = await fetch(openaiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = `OpenAI API Error: ${response.status} - ${JSON.stringify(data)}`;
      await logCompletion('FAILED', errorMsg, { upstream_status: response.status });
      return NextResponse.json({ error: 'UPSTREAM_ERROR', message: errorMsg }, { status: 502 });
    }

    // Success
    await logCompletion('ACCEPTED', 'LLM call succeeded', { model: payload.model });
    return NextResponse.json(data, { status: 200 });

  } catch (error: any) {
    const errorMsg = `Broker Network Error: ${error.message}`;
    await logCompletion('FAILED', errorMsg);
    return NextResponse.json({ error: 'NETWORK_ERROR', message: errorMsg }, { status: 502 });
  }
}
