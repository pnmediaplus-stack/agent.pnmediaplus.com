import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyN8nWebhook } from '@/lib/n8n-webhook-guard';

export const dynamic = 'force-dynamic';

const KnowledgeIngestionFailureSchema = z.object({
  document_id: z.string().uuid(),
  organization_id: z.string().uuid(),
  error_message: z.string().min(1),
  stage: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

async function patchKnowledgeDocumentFailed(params: {
  documentId: string;
  organizationId: string;
  errorMessage: string;
  stage?: string;
}) {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim().replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase credentials');
  }

  const failureMessage = params.stage
    ? `[${params.stage}] ${params.errorMessage}`.trim()
    : params.errorMessage.trim();

  const patchRes = await fetch(
    `${supabaseUrl}/rest/v1/crm_knowledge_documents?id=eq.${params.documentId}&organization_id=eq.${params.organizationId}`,
    {
      method: 'PATCH',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        status: 'failed',
        error_message: failureMessage.slice(0, 1000),
      }),
    }
  );

  if (!patchRes.ok) {
    const text = await patchRes.text().catch(() => '');
    throw new Error(`Failed to mark knowledge document as failed: ${text || patchRes.statusText}`);
  }
}

export async function POST(req: Request) {
  const guard = await verifyN8nWebhook(req, 'knowledge_ingestion_failed', KnowledgeIngestionFailureSchema);
  if (!guard.ok) return guard.response;
  if (guard.duplicate) return guard.response;

  const { payload, logCompletion } = guard;

  try {
    await patchKnowledgeDocumentFailed({
      documentId: payload.document_id,
      organizationId: payload.organization_id,
      errorMessage: payload.error_message,
      stage: payload.stage,
    });

    await logCompletion('ACCEPTED', 'Knowledge ingestion failure recorded', {
      document_id: payload.document_id,
      stage: payload.stage || 'unknown',
    });

    return NextResponse.json({
      ok: true,
      received: true,
      document_id: payload.document_id,
      status: 'failed',
    });
  } catch (error: any) {
    await logCompletion('FAILED', error?.message || 'Knowledge ingestion failure callback failed');
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
