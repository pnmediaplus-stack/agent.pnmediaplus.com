import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyUiAuth } from '@/lib/ui-auth-guard';

const GenerateCampaignSchema = z.object({
  title: z.string().min(1),
  goal: z.string().min(1),
  target_audience: z.string().optional(),
  num_ideas: z.number().optional().default(3),
  tenant_id: z.string().min(1)
});

export async function POST(req: Request) {
  // 1. Central Guard: Auth, Boundaries, Tenant Isolation
  const guard = await verifyUiAuth(req, GenerateCampaignSchema);
  if (!guard.ok) return guard.response;
  
  const { payload, logAudit } = guard;

  try {
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL; // e.g. http://host.docker.internal:5678/webhook/campaign-planner
    if (!n8nWebhookUrl) {
      return NextResponse.json({ error: 'MISSING_CONFIGURATION', message: 'N8N Webhook URL missing' }, { status: 500 });
    }

    // 2. Forward payload to N8N Orchestrator (Wait for response)
    const n8nRes = await fetch(`${n8nWebhookUrl}/campaign-planner`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Optional: N8N webhook authentication if configured
        'x-request-id': req.headers.get('x-request-id') || 'unknown'
      },
      body: JSON.stringify(payload)
    });

    if (!n8nRes.ok) {
      const errorText = await n8nRes.text();
      throw new Error(`N8N Orchestrator failed: ${n8nRes.status} - ${errorText}`);
    }

    // N8N is configured to respond with the final result JSON
    const n8nData = await n8nRes.json();

    await logAudit('GENERATE_CAMPAIGN_SUCCESS', `Campaign planned successfully via N8N Orchestrator`, { campaignId: n8nData.campaignId });
    return NextResponse.json(n8nData);

  } catch (error: any) {
    await logAudit('GENERATE_CAMPAIGN_ERROR', error.message || 'Unknown error');
    return NextResponse.json({ error: 'INTERNAL_ERROR', message: error.message }, { status: 500 });
  }
}
