import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyN8nWebhook } from '@/lib/n8n-webhook-guard';

export const dynamic = 'force-dynamic';

const GenerateLessonsPayloadSchema = z.object({
  tenant_id: z.string(), // REQUIRED FOR BILLING
}).passthrough();

export async function POST(req: Request) {
  // 1. Central Guard
  const guard = await verifyN8nWebhook(req, 'generate_lessons_call', GenerateLessonsPayloadSchema);
  if (!guard.ok) return guard.response;
  if (guard.duplicate) return guard.response;

  const { logCompletion, payload } = guard;

  try {
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!n8nWebhookUrl) {
      return NextResponse.json({ error: 'MISSING_CONFIGURATION', message: 'N8N Webhook URL missing' }, { status: 500 });
    }

    // Forward payload to N8N Orchestrator
    const n8nRes = await fetch(`${n8nWebhookUrl}/generate-lessons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': req.headers.get('x-request-id') || 'unknown'
      },
      body: JSON.stringify(payload)
    });

    if (!n8nRes.ok) {
      const errorText = await n8nRes.text();
      throw new Error(`N8N Orchestrator failed: ${n8nRes.status} - ${errorText}`);
    }

    const n8nData = await n8nRes.json();
    await logCompletion('ACCEPTED', `Lessons generated via N8N Orchestrator`);
    return NextResponse.json(n8nData);

  } catch (error: any) {
    const errorMsg = error.message || 'Unknown error occurred during generation';
    await logCompletion('FAILED', errorMsg);
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: errorMsg }, { status: 500 });
  }
}
