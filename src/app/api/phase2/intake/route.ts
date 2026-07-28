import { NextResponse } from "next/server";
import { postN8nWebhook } from "@/lib/n8n-client";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    
    // Basic validation
    if (!payload || !payload.title || !payload.brief || !payload.owner_ref) {
      return NextResponse.json(
        { error: "Missing required fields: title, brief, owner_ref" },
        { status: 400 }
      );
    }

    let webhookResult = null;
    try {
      webhookResult = await postN8nWebhook("phase2-content-pipeline-intake", payload);
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
      return NextResponse.json(
        { error: `N8N Webhook failed: ${webhookResult.message} (Status: ${webhookResult.status})` },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, webhook: webhookResult });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
}
