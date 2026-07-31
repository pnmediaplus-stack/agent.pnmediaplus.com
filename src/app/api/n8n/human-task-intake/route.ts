import { postN8nWebhook } from "@/lib/n8n-client";
import { verifyUiAuth } from '@/lib/ui-auth-guard';
import { z } from 'zod';
import { NextResponse } from 'next/server';

const IntakePayloadSchema = z.any(); // Allow flexible payload since it's a generic intake

export async function POST(request: Request) {
  // 1. Check UI Auth (Requires valid Portal Session)
  const guard = await verifyUiAuth(request, IntakePayloadSchema);
  
  if (!guard.ok) {
    return guard.response;
  }

  const { payload, user, logAudit } = guard;

  try {
    const result = await postN8nWebhook("human-task-intake", {
      received: true,
      payload,
      // Inject user metadata to ensure traceability
      _actor: { id: user.id, email: user.email }
    });

    if (result.ok) {
      await logAudit('human_task_intake', 'Forwarded to N8N successfully', { payload_summary: payload });
    } else {
      await logAudit('human_task_intake', 'Forwarded to N8N failed', { status: result.status, message: result.message });
    }

    return Response.json(
      {
        ok: result.ok,
        mocked: result.mocked,
        route: "human-task-intake",
        status: result.status,
        message: result.message,
        data: result.response ?? null,
        receivedAt: new Date().toISOString()
      },
      { status: result.status }
    );
  } catch (error) {
    await logAudit('human_task_intake', 'Internal server error', { error: error instanceof Error ? error.message : String(error) });
    return Response.json(
      {
        ok: false,
        mocked: false,
        route: "human-task-intake",
        status: 502,
        message: "Control plane approved the request, but n8n forwarding failed.",
        error: error instanceof Error ? error.message : String(error),
        receivedAt: new Date().toISOString()
      },
      { status: 502 }
    );
  }
}
