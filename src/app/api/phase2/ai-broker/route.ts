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

  // 1. Central Guard: Auth, Boundary, Idempotency, Audit
  const guard = await verifyN8nWebhook(request, 'ai_broker_call', AiBrokerPayloadSchema);
  
  if (!guard.ok) {
    return guard.response;
  }
  
  if (guard.duplicate) {
    return guard.response;
  }

  const { payload, logCompletion } = guard;

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
    
    if (error.status === 504 || (error.message && error.message.includes('UPSTREAM_TIMEOUT'))) {
       return NextResponse.json({ error: 'UPSTREAM_TIMEOUT', message: error.message }, { status: 504 });
    }
    
    // Use 500 instead of 502 so Cloudflare doesn't mask the JSON error with an HTML page
    return NextResponse.json({ error: 'LLM_ERROR', message: errorMsg }, { status: 500 });
  }
}
