"use server";

import { postN8nWebhook } from "@/lib/n8n-client";
import type { ChatIntentType } from "@/types/state";
import { verifyActionAuth } from "@/lib/action-auth-guard";
import { invokeLlm } from "@/lib/llm-client";
import { 
  dbInsertChatMessage, 
  dbInsertAuditLog, 
  dbLoadChatMessages, 
  dbDeleteChatMessage, 
  dbDeleteAuditLog, 
  dbLoadActiveTasks 
} from "@/lib/governance-api";

export async function sendChatMessage(threadId: string, body: string, intentType?: ChatIntentType) {
  let organizationId = "";
  let humanMessageId: string | undefined;
  let auditLogId: string | undefined;
  let agentMessageId: string | undefined;
  let requestId = "unknown";
  try {
    const auth = await verifyActionAuth();
    if (!auth.ok) {
      return { success: false, error: `Auth failed: ${auth.message}` };
    }

    organizationId = auth.tenantId;
    requestId = crypto.randomUUID();

    const messageResult = await dbInsertChatMessage(organizationId, {
      threadId,
      sender: "human",
      body,
      intentType
    });

    if (!messageResult.data?.id) {
      throw new Error("CHAT_MESSAGE_INSERT_FAILED");
    }

    humanMessageId = messageResult.data.id;

    const auditResult = await dbInsertAuditLog(organizationId, {
      entityId: threadId,
      entityType: "chat_thread",
      action: "message_received",
      actor: auth.email,
      details: `intent=${intentType ?? "unknown"}`
    });

    if (!auditResult.data?.id) {
      throw new Error("CHAT_AUDIT_INSERT_FAILED");
    }

    auditLogId = auditResult.data.id;

    const historyRes = await dbLoadChatMessages(organizationId, threadId);
    if (historyRes.error) throw new Error(historyRes.error);
    
    const messages = (historyRes.data || []).map(m => ({
      role: m.sender === "human" ? "user" : m.sender === "agent" ? "assistant" : "system",
      content: m.body
    }));
    
    const llmResponse: any = await invokeLlm({
      provider: "openai",
      model: "gpt-4o-mini",
      messages
    }, {
      actorId: auth.actorId,
      tenantId: auth.tenantId,
      requestId
    });

    const aiText = llmResponse?.choices?.[0]?.message?.content || "No response generated.";

    const agentMsgResult = await dbInsertChatMessage(organizationId, {
      threadId,
      sender: "agent",
      body: aiText,
      intentType: "create_content"
    });

    if (!agentMsgResult.data?.id) {
      throw new Error("AGENT_MESSAGE_INSERT_FAILED");
    }

    agentMessageId = agentMsgResult.data.id;

    await dbInsertAuditLog(organizationId, {
      entityId: threadId,
      entityType: "chat_thread",
      action: "agent_replied",
      actor: "System AI",
      details: `requestId=${requestId}`
    });

    postN8nWebhook("webhook/chat", {
      threadId,
      humanMessageId,
      body,
      tenantId: auth.tenantId,
      actorId: auth.actorId
    }).catch(e => {
      console.error("n8n webhook side-effect failed", e);
    });

    return {
      success: true,
      message: agentMsgResult.data,
      webhook: { ok: true, route: "webhook/chat", status: 202, message: "n8n webhook fired asynchronously" }
    };

  } catch (error) {
    if (organizationId && humanMessageId) await dbDeleteChatMessage(organizationId, humanMessageId).catch(() => {});
    if (organizationId && agentMessageId) await dbDeleteChatMessage(organizationId, agentMessageId).catch(() => {});
    if (organizationId && auditLogId) await dbDeleteAuditLog(organizationId, auditLogId).catch(() => {});

    const errMessage = error instanceof Error ? error.message : String(error);

    try {
      if (organizationId) {
        await dbInsertAuditLog(organizationId, {
          entityId: threadId,
          entityType: "chat_thread",
          action: "llm_invocation_failed",
          actor: "System AI",
          details: `requestId=${requestId} error=${errMessage} (Rollback Applied)`
        });
      }
    } catch (auditErr) {
      console.error("Failed to persist rollback audit log", auditErr);
    }

    try {
      if (organizationId) {
        await dbInsertChatMessage(organizationId, {
          threadId,
          sender: "system",
          body: `Hệ thống gặp lỗi trong quá trình kết nối AI Broker: ${errMessage}. Lệnh của bạn đã được hủy bỏ an toàn (Rollback).`,
          intentType: "request_status"
        });
      }
    } catch (messageErr) {
      console.error("Failed to persist rollback system message", messageErr);
    }

    return {
      success: false,
      error: errMessage,
      message: `Hệ thống gặp lỗi trong quá trình kết nối AI Broker: ${errMessage}.`
    };
  }
}

export async function pollActiveTasks() {
  const auth = await verifyActionAuth();
  if (!auth.ok) return [];
  const result = await dbLoadActiveTasks(auth.tenantId, auth.actorId);
  return result.data || [];
}
