"use server";

import { insertAuditLog, insertChatMessage, loadChatMessages, loadThreadAuditLogs } from "@/lib/phase1-loader";
import { postN8nWebhook } from "@/lib/n8n-client";
import type { ChatIntentType } from "@/types/state";

export async function sendChatMessage(threadId: string, body: string, intentType?: ChatIntentType) {
  // 1. Insert human message into DB
  const messageResult = await insertChatMessage({
    threadId,
    sender: "human",
    body,
    intentType
  });

  if (messageResult.error) {
    throw new Error(`Failed to insert chat message: ${messageResult.error}`);
  }

  // 2. Insert audit log
  await insertAuditLog({
    entityId: threadId,
    entityType: "chat",
    action: "message_received",
    actor: "Human",
    details: `intent=${intentType ?? "unknown"}`
  });

  // 3. Trigger webhook to n8n for agent processing
  // Gatekeeper requires using the human-task-intake boundary, so we call postN8nWebhook directly
  // like the API route does, to keep it server-side without absolute URL headaches.
  let webhookResult = null;
  try {
    webhookResult = await postN8nWebhook("human-task-intake", {
      received: true,
      payload: {
        threadId,
        body,
        intentType,
        sender: "human"
      }
    });
  } catch (error) {
    webhookResult = {
      ok: false,
      mocked: false,
      route: "human-task-intake",
      status: 502,
      message: error instanceof Error ? error.message : String(error)
    };
  }

  return {
    success: true,
    message: messageResult.data,
    webhook: webhookResult
  };
}

export async function pollChatMessages(threadId: string) {
  const result = await loadChatMessages(threadId);
  if (result.error) {
    throw new Error(`Failed to poll chat messages: ${result.error}`);
  }
  return result.data;
}

export async function pollAuditLogs(threadId: string) {
  const result = await loadThreadAuditLogs(threadId);
  if (result.error) {
    throw new Error(`Failed to poll audit logs: ${result.error}`);
  }
  return result.data;
}
