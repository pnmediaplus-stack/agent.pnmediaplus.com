import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyUiAuth } from '@/lib/ui-auth-guard';

const AnalyzeStrategySchema = z.object({
  locale: z.string().optional(),
  tenant_id: z.string().min(1)
});

export async function POST(req: Request) {
  const guard = await verifyUiAuth(req, AnalyzeStrategySchema);
  if (!guard.ok) return guard.response;
  
  const { payload, logAudit } = guard;

  try {
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!n8nWebhookUrl) {
      return NextResponse.json({ error: 'MISSING_CONFIGURATION', message: 'N8N Webhook URL missing' }, { status: 500 });
    }

    // Forward payload to N8N Orchestrator
    const n8nRes = await fetch(`${n8nWebhookUrl}/analyze-strategy`, {
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

    await logAudit('ANALYZE_STRATEGY_SUCCESS', `Strategy analysis completed via N8N Orchestrator`);
    return NextResponse.json(n8nData);

  } catch (error: any) {
    await logAudit('ANALYZE_STRATEGY_ERROR', error.message || 'Unknown error');
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: error.message }, { status: 500 });
  }
}
