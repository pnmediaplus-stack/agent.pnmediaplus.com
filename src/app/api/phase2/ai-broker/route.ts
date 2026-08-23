import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyN8nWebhook } from '@/lib/n8n-webhook-guard';
import { invokeLlm } from '@/lib/llm-client';

export const maxDuration = 75; // Match the upstream safety timeout in llm-client.ts
const MAX_RETRY_ATTEMPTS = 5;
const RETRY_BASE_DELAY_MS = 1000;

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

  let lastError: any = null;

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const responseData = await invokeLlm(payload, {
        actorId: 'n8n_ai_broker',
        tenantId: payload.tenant_id,
        requestId,
        async: payload.async === true
      });

      await logCompletion('ACCEPTED', 'LLM call succeeded', { model: payload.model, attempt });

      if (responseData && responseData.async_job) {
        return NextResponse.json(responseData, { status: 202 });
      }
      return NextResponse.json(responseData, { status: 200 });
    } catch (error: any) {
      lastError = error;
      const isRateLimit = error?.status === 429 || error?.message?.includes('LLM_QUOTA_EXCEEDED') || error?.message?.includes('RATE_LIMIT_EXCEEDED') || error?.message?.includes(': 429 -') || error?.message?.includes('429 Too Many Requests');
      if (!isRateLimit || attempt >= MAX_RETRY_ATTEMPTS) {
        break;
      }
      const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  const errorMsg = `Broker LLM Error: ${lastError?.message || 'Unknown error'}`;
  await logCompletion('FAILED', errorMsg);

  if (lastError?.status === 504 || (lastError?.message && lastError.message.includes('UPSTREAM_TIMEOUT'))) {
     return NextResponse.json({ error: 'UPSTREAM_TIMEOUT', message: lastError.message }, { status: 504 });
  }

  const isRateLimitFinal = lastError?.status === 429 || lastError?.message?.includes('LLM_QUOTA_EXCEEDED') || lastError?.message?.includes('RATE_LIMIT_EXCEEDED') || lastError?.message?.includes(': 429 -') || lastError?.message?.includes('429 Too Many Requests');
  if (isRateLimitFinal) {
     return NextResponse.json({ error: 'RATE_LIMIT_EXCEEDED', message: lastError.message }, { status: 429 });
  }

  // Use 500 instead of 502 so Cloudflare doesn't mask the JSON error with an HTML page
  return NextResponse.json({ error: 'LLM_ERROR', message: errorMsg }, { status: 500 });
}
