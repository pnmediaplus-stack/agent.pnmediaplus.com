"use server";

import { postN8nWebhook } from "@/lib/n8n-client";

export async function createPhase2Idea(payload: { title: string; brief: string; owner_ref: string }) {
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
    throw new Error(`N8N Webhook failed: ${webhookResult.message} (Status: ${webhookResult.status})`);
  }

  return { success: true, webhook: webhookResult };
}
