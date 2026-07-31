import { NextResponse } from "next/server";
import { z } from 'zod';
import { verifyUiAuth } from '@/lib/ui-auth-guard';
import { postN8nWebhook } from "@/lib/n8n-client";

const IntakePayloadSchema = z.object({
  title: z.string().min(1),
  brief: z.string().min(1),
  // owner_ref can be sent, but we will OVERRIDE it with the authenticated user ID for security
  owner_ref: z.string().optional()
});

export async function POST(req: Request) {
  // 1. Check UI Auth (Requires valid Portal Session)
  const guard = await verifyUiAuth(req, IntakePayloadSchema);
  
  if (!guard.ok) {
    return guard.response;
  }

  const { payload, user, logAudit } = guard;

  try {
    // 2. Override owner_ref to prevent identity spoofing
    const securePayload = {
      ...payload,
      owner_ref: user.id
    };

    let webhookResult = null;
    try {
      webhookResult = await postN8nWebhook("phase2-content-pipeline-intake", securePayload);
    } catch (error) {
      webhookResult = {
        ok: false,
        mocked: false,
        route: "phase2-content-pipeline-intake",
        status: 502,
        message: error instanceof Error ? error.message : String(error)
      };
    }

    if (!webhookResult.ok) {
      await logAudit('submit_intake', 'Forward to N8N failed', { webhook_status: webhookResult.status, webhook_error: webhookResult.message });
      return NextResponse.json(
        { error: `N8N Webhook failed: ${webhookResult.message} (Status: ${webhookResult.status})` },
        { status: 502 }
      );
    }

    await logAudit('submit_intake', 'Intake successfully submitted', { title: payload.title });
    return NextResponse.json({ success: true, webhook: webhookResult });

  } catch (error: any) {
    await logAudit('submit_intake', 'Internal server error', { error: error.message });
    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
}
