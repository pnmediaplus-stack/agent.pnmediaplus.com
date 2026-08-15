import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyN8nWebhook } from '@/lib/n8n-webhook-guard';
import { invokeLlm } from '@/lib/llm-client';

export const maxDuration = 60; // Allow long-running LLM calls

const AiBrokerPayloadSchema = z.object({
  provider: z.string().optional(),
  model: z.string(),
  tenant_id: z.string(),
}).passthrough();

export async function POST(request: Request) {
  const requestId = request.headers.get('x-request-id') || 'unknown';
  console.log('[ai-broker] inbound request', {
    requestId,
    url: request.url,
  });

  // 1. Central Guard: Auth, Boundary, Idempotency, Audit
  const guard = await verifyN8nWebhook(request, 'ai_broker_call', AiBrokerPayloadSchema);
  
  if (!guard.ok) {
    console.log('[ai-broker] guard rejected', { requestId });
    return guard.response;
  }
  
  if (guard.duplicate) {
    console.log('[ai-broker] duplicate request', { requestId });
    return guard.response;
  }

  const { payload, logCompletion } = guard;

  console.log('[ai-broker] invoking llm', {
    requestId,
    tenantId: payload.tenant_id,
    provider: payload.provider || 'openai',
    model: payload.model,
  });

  try {
    const responseData = await invokeLlm(payload, {
      actorId: 'n8n_ai_broker',
      tenantId: payload.tenant_id,
      requestId
    });

    await logCompletion('ACCEPTED', 'LLM call succeeded', { model: payload.model });
    return NextResponse.json(responseData, { status: 200 });

  } catch (error: any) {
    const errorMsg = `Broker LLM Error: ${error.message}`;
    await logCompletion('FAILED', errorMsg);
    
    if (error.message && error.message.includes('LLM_QUOTA_EXCEEDED')) {
       return NextResponse.json({ error: 'RATE_LIMIT_EXCEEDED', message: error.message }, { status: 429 });
    }
    
    // Use 500 instead of 502 so Cloudflare doesn't mask the JSON error with an HTML page
    return NextResponse.json({ error: 'LLM_ERROR', message: errorMsg }, { status: 500 });
  }
}
