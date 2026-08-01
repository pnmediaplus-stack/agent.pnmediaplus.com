"use server";

import { insertAuditLog, insertChatMessage, loadChatMessages, loadThreadAuditLogs, deleteChatMessage, deleteAuditLog } from "@/lib/phase1-loader";
import { postN8nWebhook } from "@/lib/n8n-client";
import type { ChatIntentType } from "@/types/state";

import { verifyActionAuth } from "@/lib/action-auth-guard";
import { invokeLlm } from "@/lib/llm-client";

export async function sendChatMessage(threadId: string, body: string, intentType?: ChatIntentType) {
  // 1. Authentication (Fail-closed)
  const auth = await verifyActionAuth();
  if (!auth.ok) {
    throw new Error(`Auth failed: ${auth.message}`);
  }

  const requestId = crypto.randomUUID();

  // 2. Insert human message into DB
  const messageResult = await insertChatMessage({
    threadId,
    sender: "human",
    body,
    intentType
  });

  if (messageResult.error || !messageResult.data) {
    throw new Error(`Failed to insert chat message: ${messageResult.error}`);
  }

  const humanMessageId = messageResult.data.id;

  // 3. Insert audit log for Human
  const auditResult = await insertAuditLog({
    entityId: threadId,
    entityType: "chat_thread",
    action: "message_received",
    actor: auth.email,
    details: `intent=${intentType ?? "unknown"}`
  });
  
  const auditLogId = auditResult.data?.id;
  let agentMessageId: string | undefined;

  try {
    // 4. Context Loading
    const historyRes = await loadChatMessages(threadId);
    if (historyRes.error) throw new Error(historyRes.error);
    
    // 5. LLM Invocation
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

    // 6. Insert Agent reply
    const agentMsgResult = await insertChatMessage({
      threadId,
      sender: "agent",
      body: aiText,
      intentType: "create_content" // simplified for MVP
    });

    if (agentMsgResult.error || !agentMsgResult.data) throw new Error(agentMsgResult.error || "Missing agent message data");
    
    agentMessageId = agentMsgResult.data.id;

    // 7. Insert Audit for Agent
    await insertAuditLog({
      entityId: threadId,
      entityType: "chat_thread",
      action: "agent_replied",
      actor: "System AI",
      details: `requestId=${requestId}`
    });

    return {
      success: true,
      message: agentMsgResult.data,
      webhook: { ok: true, route: "direct-llm", status: 200 }
    };

  } catch (error) {
    // 8. TRUE Rollback/Compensate: Delete all inserted records (Human message, Agent message, and initial Audit log)
    if (humanMessageId) {
      await deleteChatMessage(humanMessageId).catch(() => {});
    }
    if (agentMessageId) {
      await deleteChatMessage(agentMessageId).catch(() => {});
    }
    if (auditLogId) {
      await deleteAuditLog(auditLogId).catch(() => {});
    }
    
    const errMessage = error instanceof Error ? error.message : String(error);
    
    await insertAuditLog({
      entityId: threadId,
      entityType: "chat_thread",
      action: "llm_invocation_failed",
      actor: "System AI",
      details: `requestId=${requestId} error=${errMessage} (Rollback Applied)`
    });

    await insertChatMessage({
      threadId,
      sender: "system",
      body: `Hệ thống gặp lỗi trong quá trình kết nối AI Broker: ${errMessage}. Lệnh của bạn đã được hủy bỏ an toàn (Rollback).`,
      intentType: "request_status"
    });

    throw error;
  }
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
