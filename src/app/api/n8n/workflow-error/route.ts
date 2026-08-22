import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyN8nWebhook } from '@/lib/n8n-webhook-guard';
import { dbInsertChatMessage } from '@/lib/governance-api';

export const dynamic = 'force-dynamic';

const WorkflowErrorPayloadSchema = z.object({
  workflow_run_id: z.string().min(1),
  organization_id: z.string().uuid(),
  content_item_id: z.string().optional(),
  thread_id: z.string().uuid().optional(),
  error_message: z.string().min(1),
  metadata: z.record(z.string(), z.any()).optional(),
});

export async function POST(req: Request) {
  const guard = await verifyN8nWebhook(req, 'workflow_error_report', WorkflowErrorPayloadSchema);
  if (!guard.ok) return guard.response;
  if (guard.duplicate) return guard.response;

  const { payload, logCompletion } = guard;
  const { workflow_run_id, organization_id, content_item_id, thread_id, error_message, metadata } = payload;

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';

  if (!supabaseUrl || !serviceKey) {
    await logCompletion('FAILED', 'Missing Supabase credentials');
    return NextResponse.json({ ok: false, error: 'MISSING_CONFIGURATION' }, { status: 500 });
  }

  try {
    const upsertRes = await fetch(`${supabaseUrl}/rest/v1/workflow_run_context?on_conflict=workflow_run_id`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        workflow_run_id,
        organization_id,
        thread_id: thread_id || null,
        content_item_id: content_item_id || null,
        workflow_name: 'PHASE3_AUTO_CONTENT_CREATOR',
        status: 'error',
        last_error: error_message,
        payload: {
          ...metadata,
          error_message,
          contextMissing: !thread_id,
        },
      }),
    });

    if (!upsertRes.ok) {
      const text = await upsertRes.text().catch(() => '');
      throw new Error(`WORKFLOW_CONTEXT_UPSERT_FAILED: ${text || upsertRes.statusText}`);
    }

    if (thread_id) {
      await dbInsertChatMessage(organization_id, {
        threadId: thread_id,
        sender: 'system',
        body: `❌ **Tạo bài viết thất bại!**\n\nHệ thống gặp lỗi:\n*${error_message}*\n\nVui lòng thử lại sau.`,
        intentType: 'notify_error',
      }).catch((err) => console.error('[workflow-error] Failed to insert chat error message:', err));
    }

    await logCompletion('ACCEPTED', 'Workflow error recorded', { workflow_run_id, has_thread_id: Boolean(thread_id) });
    return NextResponse.json({ ok: true, received: true, workflow_run_id, has_thread_id: Boolean(thread_id) });
  } catch (error: any) {
    await logCompletion('FAILED', error?.message || 'Unknown workflow error');
    return NextResponse.json({ ok: false, error: error?.message || 'INTERNAL_ERROR' }, { status: 500 });
  }
}
