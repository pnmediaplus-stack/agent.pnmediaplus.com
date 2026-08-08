"use server";

import { postN8nWebhook } from "@/lib/n8n-client";
import type { ChatIntentType } from "@/types/state";
import { verifyActionAuth } from "@/lib/action-auth-guard";

import { loadMarketingAgentRegistry } from "@/lib/marketing-agent-loader";
import {
  dbInsertChatMessage,
  dbInsertAuditLog,
  dbLoadChatMessages,
  dbDeleteChatMessage,
  dbDeleteAuditLog,
  dbLoadActiveTasks,
  dbLoadContextData
} from "@/lib/governance-api";
import { requiresCampaignScope, requiresPublishScope, inferChatIntent } from "@/lib/validators";



function buildUnknownIntentReply() {
  return "Mình chưa xác định được ý định. Bạn hãy chọn một trong các hướng sau: tạo nội dung, đăng nội dung, lập kế hoạch chiến dịch, định tuyến phòng ban, xem trạng thái, kiểm tra quản trị, xem xét tài nguyên, hoặc duyệt/từ chối.";
}

function buildMissingScopeReply(intentType?: ChatIntentType) {
  if (intentType === "publish_content") {
    return "Bạn muốn đăng lên page nào? Hãy cung cấp tên page hoặc page_id để mình chuyển đúng luồng publish.";
  }
  if (intentType === "plan_campaign" || intentType === "route_department") {
    return "Bạn muốn giao việc cho phòng ban nào? Hãy cung cấp tên phòng ban hoặc department_id để mình route đúng agent.";
  }
  return "Thiếu scope bắt buộc. Hãy bổ sung page, phòng ban, hoặc mã định danh liên quan để mình route đúng.";
}

export async function sendChatMessage(threadId: string, body: string) {
  const intentType = inferChatIntent(body);
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

    // === SLASH COMMAND PARSER ===
    if (body.trim().startsWith('/')) {
      const parts = body.trim().split(/\s+/);
      const command = parts[0];
      const args = parts.slice(1);

      const whitelist = ['/auto_content', '/viral_research', '/publish', '/plan_campaign', '/status'];

      if (whitelist.includes(command)) {
        // Enforce args
        let missingArgsMsg = '';
        if (command === '/auto_content' || command === '/viral_research' || command === '/status') {
          if (args.length < 1) missingArgsMsg = `Lệnh ${command} yêu cầu tham số: <content_item_id> (Ví dụ: ${command} 12345)`;
        } else if (command === '/publish') {
          if (args.length < 2) missingArgsMsg = 'Lệnh /publish yêu cầu tham số: <page_id|page_name> <content_item_id>';
        } else if (command === '/plan_campaign') {
          if (args.length < 2) missingArgsMsg = 'Lệnh /plan_campaign yêu cầu tham số: <department_id|department_name> <brief>';
        }

        if (missingArgsMsg) {
          // Reject
          await dbInsertAuditLog(organizationId, {
            entityId: threadId,
            entityType: "chat_thread",
            action: "command_rejected",
            actor: auth.email,
            details: `command=${command} reason=missing_args`
          });

          const rejectMsgResult = await dbInsertChatMessage(organizationId, {
            threadId,
            sender: "system",
            body: missingArgsMsg,
            intentType: "clarify_missing_scope"
          });

          return {
            success: true,
            message: rejectMsgResult.data,
            webhook: { ok: false, route: "parser", status: 400, message: "Missing command arguments" }
          };
        }

        // Route successfully
        await dbInsertAuditLog(organizationId, {
          entityId: threadId,
          entityType: "chat_thread",
          action: "command_routed",
          actor: auth.email,
          details: `command=${command} args=${args.join(' ')}`
        });

        // Fire mock/real webhook depending on command
        // For /auto_content we hit our newly integrated workflow "generate-content" endpoint
        let webhookResult;
        if (command === '/auto_content') {
           webhookResult = await postN8nWebhook("webhook/generate-content", {
             contentItemId: args[0],
             organization_id: organizationId,
             tenant_id: organizationId
           });

           const routedMsgResult = await dbInsertChatMessage(organizationId, {
             threadId,
             sender: "system",
             body: `Đã nhận và điều phối lệnh: ${command} ${args.join(' ')}`,
             intentType: "route_department"
           });

           return {
             success: true,
             message: routedMsgResult.data,
             webhook: { ok: webhookResult.ok, route: "webhook/command", status: webhookResult.status || 202, message: webhookResult.message }
           };
        } else {
           const rejectMsgResult = await dbInsertChatMessage(organizationId, {
             threadId,
             sender: "system",
             body: `Lệnh ${command} hợp lệ nhưng chưa có Workflow xử lý (Not Implemented).`,
             intentType: "clarify_missing_scope"
           });

           return {
             success: true,
             message: rejectMsgResult.data,
             webhook: { ok: false, route: "not_routed", status: 400, message: "Lệnh hợp lệ nhưng chưa có workflow xử lý (Not Implemented)." }
           };
        }
      } else {
        // If not in whitelist, reject fail-closed instead of falling through
        const rejectMsgResult = await dbInsertChatMessage(organizationId, {
          threadId,
          sender: "system",
          body: `Lệnh ${command} không hợp lệ. Vui lòng sử dụng tính năng chat thường hoặc các lệnh có trong hệ thống.`,
          intentType: "clarify_missing_scope"
        });

        return {
          success: true,
          message: rejectMsgResult.data,
          webhook: { ok: false, route: "not_routed", status: 400, message: "Unknown slash command rejected" }
        };
      }
    }
    // === END SLASH COMMAND PARSER ===


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

    if (intentType === "unknown") {
      const routerReply = buildUnknownIntentReply();
      const routerMsgResult = await dbInsertChatMessage(organizationId, {
        threadId,
        sender: "system",
        body: routerReply,
        intentType: "request_status"
      });

      if (!routerMsgResult.data?.id) {
        throw new Error("ROUTER_MESSAGE_INSERT_FAILED");
      }

      await dbInsertAuditLog(organizationId, {
        entityId: threadId,
        entityType: "chat_thread",
        action: "intent_routed",
        actor: "System AI",
        details: `intent=unknown requestId=${requestId}`
      });

      // Removed postN8nWebhook for "unknown" intent per Gatekeeper constraint:
      // "Nếu là unknown thì chỉ trả phản hồi mẫu hoặc hỏi lại, không gọi LLM/workflow tự do"

      return {
        success: true,
        message: routerMsgResult.data,
        webhook: { ok: false, route: "not_routed", status: 400, message: "Intent unknown, webhook not fired" }
      };
    }

    if (intentType === "publish_content" && requiresPublishScope(body)) {
      const clarifyReply = buildMissingScopeReply(intentType);
      const clarifyMsgResult = await dbInsertChatMessage(organizationId, {
        threadId,
        sender: "system",
        body: clarifyReply,
        intentType: "clarify_missing_scope"
      });

      if (!clarifyMsgResult.data?.id) {
        throw new Error("CLARIFY_SCOPE_MESSAGE_INSERT_FAILED");
      }

      await dbInsertAuditLog(organizationId, {
        entityId: threadId,
        entityType: "chat_thread",
        action: "scope_clarification_requested",
        actor: "System AI",
        details: `intent=publish_content requestId=${requestId}`
      });

      return {
        success: true,
        message: clarifyMsgResult.data,
        webhook: { ok: true, route: "chat", status: 202, message: "scope clarification requested" }
      };
    }

    if (intentType === "plan_campaign" || intentType === "route_department") {
      if (requiresCampaignScope(body)) {
        const clarifyReply = buildMissingScopeReply(intentType);
        const clarifyMsgResult = await dbInsertChatMessage(organizationId, {
          threadId,
          sender: "system",
          body: clarifyReply,
          intentType: "clarify_missing_scope"
        });

        if (!clarifyMsgResult.data?.id) {
          throw new Error("CLARIFY_SCOPE_MESSAGE_INSERT_FAILED");
        }

        await dbInsertAuditLog(organizationId, {
          entityId: threadId,
          entityType: "chat_thread",
          action: "scope_clarification_requested",
          actor: "System AI",
          details: `intent=${intentType} requestId=${requestId}`
        });

        return {
          success: true,
          message: clarifyMsgResult.data,
          webhook: { ok: true, route: "chat", status: 202, message: "scope clarification requested" }
        };
      }

      const routePayload = {
        threadId,
        humanMessageId,
        body,
        tenantId: auth.tenantId,
        actorId: auth.actorId,
        intentType,
        routedIntent: intentType
      };

      const routed = await postN8nWebhook("webhook/human-task-intake", routePayload);
      if (!routed.ok) {
        throw new Error(`DEPARTMENT_ROUTE_FAILED: ${routed.status} ${routed.message}`);
      }

      const routedReply = `Đã chuyển yêu cầu "${intentType}" vào luồng điều phối theo phòng ban.`;
      const routedMsgResult = await dbInsertChatMessage(organizationId, {
        threadId,
        sender: "system",
        body: routedReply,
        intentType: "route_department"
      });

      if (!routedMsgResult.data?.id) {
        throw new Error("ROUTED_MESSAGE_INSERT_FAILED");
      }

      await dbInsertAuditLog(organizationId, {
        entityId: threadId,
        entityType: "chat_thread",
        action: "department_route_requested",
        actor: "System AI",
        details: `intent=${intentType} requestId=${requestId}`
      });

      return {
        success: true,
        message: routedMsgResult.data,
        webhook: { ok: true, route: "webhook/human-task-intake", status: routed.status, message: routed.message }
      };
    }

    const historyRes = await dbLoadChatMessages(organizationId, threadId);
    if (historyRes.error) throw new Error(historyRes.error);

    // === @MENTION & #DATA PARSER ===
    const agentMatch = body.match(/@([a-zA-Z0-9_]+)/);
    const dataMatch = body.match(/#(content|idea):([a-zA-Z0-9_-]+)/);

    // The Orchestrator does not build System Prompts.
    // It only validates scope and gates requests.
    if (agentMatch) {
      const agentId = agentMatch[1];
      const registry = await loadMarketingAgentRegistry();

      if (registry.state === 'blocked') {
        throw new Error('GOVERNANCE_REGISTRY_BLOCKED');
      }

      let agent = registry.data.agents.find(a => a.role_id === agentId);
      if (!agent) {
        const aliasMatches = registry.data.agents.filter(a => a.role_id.endsWith(`_${agentId}`));
        if (aliasMatches.length === 1) {
          agent = aliasMatches[0];
        } else if (aliasMatches.length > 1) {
          const rejectMsgResult = await dbInsertChatMessage(organizationId, {
            threadId,
            sender: "system",
            body: `Tên Alias @${agentId} trùng khớp với nhiều Agent. Vui lòng ghi rõ tên đầy đủ để tránh nhầm lẫn quyền hạn.`,
            intentType: "clarify_missing_scope"
          });
          return { success: true, message: rejectMsgResult.data };
        }
      }

      if (!agent) {
        // Fail-closed as per contract
        const rejectMsgResult = await dbInsertChatMessage(organizationId, {
          threadId,
          sender: "system",
          body: `Agent @${agentId} không tồn tại hoặc không được phép truy cập.`,
          intentType: "clarify_missing_scope"
        });
        return { success: true, message: rejectMsgResult.data };
      }

      // Scope is validated. We do not need to inject boundaries here because
      // we do not call the LLM in the Orchestrator layer.
    }

    if (dataMatch) {
      const refType = dataMatch[1] as 'content' | 'idea';
      const refKey = dataMatch[2];

      const contextDataRes = await dbLoadContextData(organizationId, refType, refKey);
      if (contextDataRes.error || !contextDataRes.data) {
        const rejectMsgResult = await dbInsertChatMessage(organizationId, {
          threadId,
          sender: "system",
          body: `Không tìm thấy dữ liệu #${refType}:${refKey} trong scope của tổ chức.`,
          intentType: "clarify_missing_scope"
        });
        return { success: true, message: rejectMsgResult.data };
      }

      // Scope is validated. Data exists.
    }
    // === END @MENTION PARSER ===


    // GATE PASSED. Route to Workflow.
    postN8nWebhook("webhook/chat", {
      threadId,
      humanMessageId,
      body,
      tenantId: auth.tenantId,
      actorId: auth.actorId,
      intentType
    }).catch(e => {
      console.error("n8n webhook side-effect failed", e);
    });

    const routeReply = `Yêu cầu "${intentType}" đã vượt qua cổng kiểm duyệt. Đang chuyển giao cho Workflow...`;

    const agentMsgResult = await dbInsertChatMessage(organizationId, {
      threadId,
      sender: "system",
      body: routeReply,
      intentType: "request_status"
    });

    if (!agentMsgResult.data?.id) {
      throw new Error("SYSTEM_MESSAGE_INSERT_FAILED");
    }

    agentMessageId = agentMsgResult.data.id;

    await dbInsertAuditLog(organizationId, {
      entityId: threadId,
      entityType: "chat_thread",
      action: "webhook_dispatched",
      actor: "System AI",
      details: `requestId=${requestId} intent=${intentType}`
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
          action: "orchestrator_routing_failed",
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
          body: `Hệ thống gặp lỗi trong quá trình điều phối Workflow: ${errMessage}. Lệnh của bạn đã được hủy bỏ an toàn (Rollback).`,
          intentType: "request_status"
        });
      }
    } catch (messageErr) {
      console.error("Failed to persist rollback system message", messageErr);
    }

    return {
      success: false,
      error: errMessage,
      message: `Hệ thống gặp lỗi trong quá trình điều phối Workflow: ${errMessage}.`
    };
  }
}

export async function pollActiveTasks() {
  const auth = await verifyActionAuth();
  if (!auth.ok) return [];
  const result = await dbLoadActiveTasks(auth.tenantId, auth.actorId);
  return result.data || [];
}
