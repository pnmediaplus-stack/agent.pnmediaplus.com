"use server";

import { postN8nWebhook } from "@/lib/n8n-client";
import type { ChatIntentType } from "@/types/state";
import { verifyActionAuth } from "@/lib/action-auth-guard";
import { cookies } from "next/headers";
import { issueReferenceToken } from "./vault-actions";

import { loadMarketingAgentRegistry } from "@/lib/marketing-agent-loader";
import {
  loadDepartmentGovernanceBundle,
  type DepartmentRegistryRecord
} from "@/lib/department-governance-loader";
import {
  buildCampaignPlanRequestContract
} from "@/lib/plan-campaign-contract";
import {
  dbInsertChatMessage,
  dbInsertAuditLog,
  dbLoadChatMessages,
  dbDeleteChatMessage,
  dbDeleteAuditLog,
  dbLoadActiveTasks,
  dbCreateContentItemFromBrief,
  dbResolveActiveCampaign,
  dbApproveAndCreateCampaign,
  dbUpdateThreadCampaign,
  dbLoadContextData
} from "@/lib/governance-api";
import { requiresCampaignScope, requiresPublishScope } from "@/lib/validators";



function buildUnknownIntentReply() {
  return "Mình chưa xác định được ý định. Bạn hãy chọn một trong các hướng sau: tạo nội dung, đăng nội dung, lập kế hoạch chiến dịch, định tuyến phòng ban, xem trạng thái, kiểm tra quản trị, xem xét tài nguyên, hoặc duyệt/từ chối.";
}

function buildMissingScopeReply(intentType?: ChatIntentType) {
  if (intentType === "publish_content") {
    return "Bạn muốn đăng lên page nào? Hãy cung cấp tên page hoặc page_id để mình chuyển đúng luồng publish.";
  }
  if (intentType === "plan_campaign" || intentType === "route_department") {
    return "Bạn muốn giao việc cho phòng ban nào? Hãy cung cấp department_id hoặc department_name khớp đúng registry để mình route đúng agent.";
  }
  return "Thiếu scope bắt buộc. Hãy bổ sung page, phòng ban, hoặc mã định danh liên quan để mình route đúng.";
}

function buildReadOnlyReferenceReply(referenceType: "agent" | "data") {
  if (referenceType === "agent") {
    return "Mình đã nhận tham chiếu agent, nhưng mention chỉ được dùng để nạp ngữ cảnh đọc-tham-chiếu. Chat không thể tự kích hoạt agent execution.";
  }

  return "Mình đã nhận tham chiếu dữ liệu, nhưng reference này chỉ dùng để nạp ngữ cảnh đọc-tham-chiếu. Chat không thể tự biến reference thành workflow execution.";
}

type DepartmentScopeHint = {
  departmentId?: string;
  departmentName?: string;
};

function extractDepartmentScopeHint(body: string): DepartmentScopeHint {
  const normalized = body.trim();
  const departmentId =
    normalized.match(/\bdepartment[_\s-]?id\b\s*[:=]\s*([a-z0-9_-]+)\b/i)?.[1] ??
    normalized.match(/#department:([a-z0-9_-]+)\b/i)?.[1] ??
    normalized.match(/\bdept[_\s-]?id\b\s*[:=]\s*([a-z0-9_-]+)\b/i)?.[1];
  const departmentName =
    normalized.match(/\bdepartment[_\s-]?name\b\s*[:=]\s*([a-z0-9][a-z0-9 _-]*?)\s*(?:$|[,;|])/i)?.[1]?.trim() ??
    normalized.match(/\bdept[_\s-]?name\b\s*[:=]\s*([a-z0-9][a-z0-9 _-]*?)\s*(?:$|[,;|])/i)?.[1]?.trim();

  return {
    departmentId: departmentId?.trim(),
    departmentName: departmentName?.trim()
  };
}

function matchDepartmentRegistryRecord(
  records: DepartmentRegistryRecord[],
  hint: DepartmentScopeHint
): DepartmentRegistryRecord | null {
  if (hint.departmentId) {
    const byId = records.find((record) => record.department_id === hint.departmentId);
    if (byId) return byId;
  }

  if (hint.departmentName) {
    const normalizedName = hint.departmentName.toLowerCase();
    const byName = records.filter(
      (record) => record.department_name.toLowerCase() === normalizedName
    );
    if (byName.length === 1) return byName[0];
    if (byName.length > 1) {
      throw new Error(
        `DEPARTMENT_SCOPE_AMBIGUOUS: ${hint.departmentName} matches multiple registry records`
      );
    }
  }

  return null;
}

async function issueAutoContentReferenceToken(organizationId: string) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("pn_portal_access_token")?.value?.trim() || "";

  if (!accessToken) {
    throw new Error("UNAUTHORIZED_MISSING_PORTAL_TOKEN");
  }

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim().replace(/\/$/, "");
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();

  if (!supabaseUrl || !anonKey) {
    throw new Error("ACTIVE_MODEL_LOOKUP_FAILED: Missing Supabase env");
  }

  const endpoint = new URL(`${supabaseUrl}/rest/v1/phase070_tenant_integration_status`);
  endpoint.searchParams.set("select", "integration_key,provider_code,status,connection_state");
  endpoint.searchParams.set("organization_id", `eq.${encodeURIComponent(organizationId)}`);
  endpoint.searchParams.set("provider_code", `eq.fal_ai`);
  endpoint.searchParams.set("status", `eq.configured`);
  endpoint.searchParams.set("connection_state", `eq.healthy`);
  endpoint.searchParams.set("order", "updated_at.desc");
  endpoint.searchParams.set("limit", "1");

  const response = await fetch(endpoint, {
    method: "GET",
    cache: "no-store",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "Accept-Profile": "public"
    }
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`ACTIVE_MODEL_LOOKUP_FAILED: ${response.status}:${body || response.statusText}`);
  }

  const integrationRows = (await response.json().catch(() => [])) as Array<{
    integration_key?: string;
    provider_code?: string;
  }>;

  const integrationRow = Array.isArray(integrationRows) ? integrationRows[0] : null;
  if (!integrationRow?.integration_key || integrationRow.provider_code !== "fal_ai") {
    throw new Error("NO_VALID_ROW: No configured healthy fal_ai integration row found");
  }

  const providerCode = "fal_ai";
  const tokenResponse = await issueReferenceToken(
    String(integrationRow.integration_key),
    providerCode
  );

  const leaseToken = tokenResponse.data?.receipt?.lease_token;
  if (!tokenResponse.ok || !leaseToken) {
    throw new Error(`FAILED_TO_ISSUE_REFERENCE_TOKEN: ${tokenResponse.reason}`);
  }

  return leaseToken;
}

export async function sendChatMessage(threadId: string, body: string) {
  let intentType: import('@/types/state').ChatIntentType = "unknown";
  
  const trimmedBody = body.trim();
  if (trimmedBody.startsWith('/')) {
    const cmd = trimmedBody.split(/\s+/)[0];
    if (cmd === '/auto_content') intentType = 'create_content';
    else if (cmd === '/viral_research') intentType = 'create_content';
    else if (cmd === '/publish') intentType = 'publish_content';
    else if (cmd === '/plan_campaign') intentType = 'plan_campaign';
    else if (cmd === '/status') intentType = 'request_status';
  }

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
    if (trimmedBody.startsWith('/')) {
      const parts = trimmedBody.split(/\s+/);
      const command = parts[0];
      const args = parts.slice(1);

      const whitelist = ['/auto_content', '/viral_research', '/publish', '/plan_campaign', '/status', '/campaign', '/approve_campaign'];

      if (whitelist.includes(command)) {
        // Enforce args
        let missingArgsMsg = '';
        if (command === '/auto_content' || command === '/viral_research') {
          if (args.length < 1) missingArgsMsg = `Lệnh ${command} yêu cầu tham số: <content_item_id> hoặc đoạn văn bản (Ví dụ: ${command} 12345 hoặc ${command} Nội dung bài viết...)`;
        } else if (command === '/status') {
          if (args.length < 1) missingArgsMsg = `Lệnh ${command} yêu cầu tham số: <content_item_id> (Ví dụ: ${command} 12345)`;
        } else if (command === '/publish') {
          if (args.length < 2) missingArgsMsg = 'Lệnh /publish yêu cầu tham số: <page_id|page_name> <content_item_id>';
        } else if (command === '/plan_campaign') {
          if (args.length < 2) missingArgsMsg = 'Lệnh /plan_campaign yêu cầu tham số: <department_id|department_name> <brief>';
        } else if (command === '/campaign') {
          if (args[0] !== 'set' || args.length < 2) missingArgsMsg = 'Lệnh /campaign yêu cầu cú pháp: /campaign set <tên_hoặc_id>';
        } else if (command === '/approve_campaign') {
          if (args.length < 1) missingArgsMsg = 'Lệnh /approve_campaign yêu cầu tham số: <Tên Chiến Dịch>';
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
            success: false,
            message: rejectMsgResult.data,
            webhook: { ok: false, route: "parser", status: 400, message: "Missing command arguments" }
          };
        }

        // Command received (routing happens below)
        await dbInsertAuditLog(organizationId, {
          entityId: threadId,
          entityType: "chat_thread",
          action: "command_received",
          actor: auth.email,
          details: `command=${command} args=${args.join(' ')}`
        });

        // Fire mock/real webhook depending on command
        // For /auto_content we hit our newly integrated workflow "generate-content" endpoint
        let webhookResult;
        if (command === '/auto_content' || command === '/viral_research') {
           const referenceToken = await issueAutoContentReferenceToken(organizationId);
           
           // 1. Parse out --campaign="name" if present
           let explicitCampaign: string | null = null;
           let commandBodyStr = args.join(' ');
           const campaignMatch = commandBodyStr.match(/--campaign=(?:"([^"]+)"|'([^']+)'|([^\s]+))/);
           if (campaignMatch) {
             explicitCampaign = campaignMatch[1] || campaignMatch[2] || campaignMatch[3];
             commandBodyStr = commandBodyStr.replace(campaignMatch[0], '').trim();
           }
           
           // 2. Resolve Active Campaign (Fail-Closed logic applied here)
           const campaignResolution = await dbResolveActiveCampaign(organizationId, threadId, explicitCampaign);
           if (campaignResolution.error) {
              const rejectMsgResult = await dbInsertChatMessage(organizationId, {
                threadId,
                sender: "system",
                body: `Từ chối lệnh: ${campaignResolution.message}`,
                intentType: "clarify_missing_scope"
              });
              return {
                success: false,
                message: rejectMsgResult.data,
                webhook: { ok: false, route: "parser", status: 400, message: campaignResolution.error }
              };
           }
           
           const resolvedCampaign = campaignResolution.campaign;
           
           // Extract new args after removing flag
           const newArgs = commandBodyStr.split(/\s+/).filter(Boolean);
           let contentItemId = newArgs[0] || '';
           const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
           
           if (!uuidRegex.test(contentItemId)) {
             const briefText = commandBodyStr;
             const newItemResult = await dbCreateContentItemFromBrief(
               organizationId, 
               briefText, 
               auth.email, 
               resolvedCampaign ? resolvedCampaign.id : null
             );
             
             if (newItemResult.error || !newItemResult.data) {
                const rejectMsgResult = await dbInsertChatMessage(organizationId, {
                  threadId,
                  sender: "system",
                  body: `Lỗi khởi tạo nội dung: ${newItemResult.error || 'Unknown Error'}. Vui lòng thử lại.`,
                  intentType: "clarify_missing_scope"
                });
                return {
                  success: false,
                  message: rejectMsgResult.data,
                  webhook: { ok: false, route: "parser", status: 500, message: "Failed to create content item from brief" }
                };
             }
             
             contentItemId = newItemResult.data.id;
             
             let sysMsg = `Đã tự động khởi tạo Content Item mới (ID: \`${contentItemId}\`) từ văn bản của bạn.`;
             if (resolvedCampaign) {
               sysMsg += `\nĐã nhận diện Context: Chiến dịch **${resolvedCampaign.name}**.`;
             }
             sysMsg += ` Đang chuyển sang luồng AI xử lý...`;
             
             await dbInsertChatMessage(organizationId, {
               threadId,
               sender: "system",
               body: sysMsg,
               intentType: "route_department"
             });
           }

           webhookResult = await postN8nWebhook("webhook/generate-content", {
             contentItemId: contentItemId,
             organization_id: organizationId,
             tenant_id: organizationId,
             reference_token: referenceToken,
             campaignContext: resolvedCampaign // Send context to N8N
           });

           const routedMsgResult = await dbInsertChatMessage(organizationId, {
             threadId,
             sender: "system",
             body: `Đã nhận và điều phối lệnh: ${command} ${args.join(' ')}`,
             intentType: "route_department"
           });

           const n8nRespRaw = webhookResult.response as any;
           const n8nResp = Array.isArray(n8nRespRaw) ? n8nRespRaw[0] : n8nRespRaw;
           if (n8nResp && n8nResp.artifacts) {
             const artifacts = n8nResp.artifacts;
             let bodyStr = `**Nội dung đã được tạo thành công (QA_ready)**\n\n`;
             if (artifacts.image) {
               bodyStr += `![Generated Image](${artifacts.image})\n\n`;
             }
             if (artifacts.caption) {
               bodyStr += `**Caption:**\n${artifacts.caption}\n\n`;
             }
             if (artifacts.research) {
               const researchStr = typeof artifacts.research === 'object' 
                 ? "```json\n" + JSON.stringify(artifacts.research, null, 2) + "\n```"
                 : artifacts.research;
               bodyStr += `**Research Packet:**\n${researchStr}\n\n`;
             }

             await dbInsertChatMessage(organizationId, {
               threadId,
               sender: "system",
               body: bodyStr,
               intentType: "route_department"
             });
           }

           return {
             success: true,
             message: routedMsgResult.data ? JSON.parse(JSON.stringify(routedMsgResult.data)) : null,
             webhook: { ok: webhookResult.ok, route: "webhook/command", status: webhookResult.status || 202, message: webhookResult.message }
           };
        } else if (command === '/approve_campaign') {
          const campaignTitle = args.join(' ');
          const approveRes = await dbApproveAndCreateCampaign(organizationId, threadId, campaignTitle);
          
          if (approveRes.error || !approveRes.data) {
             const rejectMsgResult = await dbInsertChatMessage(organizationId, {
               threadId,
               sender: "system",
               body: `Từ chối lệnh: ${approveRes.error || 'Lỗi không xác định'}`,
               intentType: "clarify_missing_scope"
             });
             return {
               success: false,
               message: rejectMsgResult.data,
               webhook: { ok: false, route: "parser", status: 400, message: approveRes.error || 'Lỗi duyệt chiến dịch' }
             };
          }
          
          // Attach campaign to thread
          const updateRes = await dbUpdateThreadCampaign(organizationId, threadId, approveRes.data.id);
          
          if (updateRes.error) {
             const partialMsgResult = await dbInsertChatMessage(organizationId, {
               threadId,
               sender: "system",
               body: `Chiến dịch **${campaignTitle}** đã tạo thành công nhưng việc gắn vào luồng chat thất bại (${updateRes.error}). Vui lòng gõ lại lệnh /campaign set để gắn thủ công.`,
               intentType: "request_status"
             });
             return {
               success: false,
               message: partialMsgResult.data,
               webhook: { ok: false, route: "handled_internally", status: 500, message: "Campaign created but thread bind failed" }
             };
          }
          
          const successMsgResult = await dbInsertChatMessage(organizationId, {
            threadId,
            sender: "system",
            body: `Chiến dịch **${campaignTitle}** đã được duyệt và lưu thành công vào cơ sở dữ liệu! Luồng chat hiện tại đã được tự động gắn vào chiến dịch này.`,
            intentType: "request_status"
          });
          
          return {
            success: true,
            message: successMsgResult.data,
            webhook: { ok: true, route: "handled_internally", status: 200, message: "Campaign approved and activated" }
          };
        } else if (command === '/plan_campaign') {
          return await routePlanCampaignCommand(organizationId, threadId, requestId, auth, humanMessageId, body);
        } else if (command === '/campaign') {
          if (args[0] === 'set') {
            const explicitCampaign = args.slice(1).join(' ');
            const resolution = await dbResolveActiveCampaign(organizationId, threadId, explicitCampaign);
            if (resolution.error || !resolution.campaign) {
              const rejectMsgResult = await dbInsertChatMessage(organizationId, {
                threadId,
                sender: "system",
                body: `Không thể thiết lập chiến dịch: ${resolution.message || resolution.error}`,
                intentType: "clarify_missing_scope"
              });
              return { success: false, message: rejectMsgResult.data };
            }
            // Update thread's active_campaign_id
            const { error: updateErr } = await dbUpdateThreadCampaign(organizationId, threadId, resolution.campaign.id);
              
            if (updateErr) {
               throw new Error('FAILED_TO_SET_ACTIVE_CAMPAIGN');
            }
            
            const successMsgResult = await dbInsertChatMessage(organizationId, {
              threadId,
              sender: "system",
              body: `Đã thiết lập chiến dịch hiện tại cho luồng này: **${resolution.campaign.name}**. Các lệnh /viral_research tiếp theo sẽ tự động bám sát chiến dịch này.`,
              intentType: "route_department"
            });
            return { success: true, message: successMsgResult.data };
          }
          return { success: false };
        } else {
           const rejectMsgResult = await dbInsertChatMessage(organizationId, {
             threadId,
             sender: "system",
             body: `Lệnh ${command} hợp lệ nhưng chưa có Workflow xử lý (Not Implemented).`,
             intentType: "clarify_missing_scope"
           });

           return {
             success: false,
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
          success: false,
          message: rejectMsgResult.data,
          webhook: { ok: false, route: "not_routed", status: 400, message: "Unknown slash command rejected" }
        };
      }
    }
    // === END SLASH COMMAND PARSER ===


    // === @MENTION & #DATA PARSER ===
    const agentMatch = body.match(/@([a-zA-Z0-9_]+)/);
    const dataMatch = body.match(/#(content|idea):([a-zA-Z0-9_-]+)/);

    // The Orchestrator does not build System Prompts.
    // It only validates scope and gates requests.
    if (agentMatch) {
      const agentId = agentMatch[1];
      const registry = await loadMarketingAgentRegistry();

      if (registry.state === 'blocked') {
        const blockedMsgResult = await dbInsertChatMessage(organizationId, {
          threadId,
          sender: "system",
          body: "Danh mục agent marketing hiện đang bị chặn bởi governance registry. Hãy thử lại khi registry sẵn sàng.",
          intentType: "request_status"
        });

        if (!blockedMsgResult.data?.id) {
          throw new Error("GOVERNANCE_REGISTRY_BLOCKED_MESSAGE_INSERT_FAILED");
        }

        await dbInsertAuditLog(organizationId, {
          entityId: threadId,
          entityType: "chat_thread",
          action: "marketing_governance_blocked",
          actor: "System AI",
          details: `requestId=${requestId} reason=${registry.reason}`
        });

        return {
          success: false,
          message: blockedMsgResult.data,
          webhook: {
            ok: false,
            route: "not_routed",
            status: 503,
            message: registry.reason
          }
        };
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

      const mentionReply = buildReadOnlyReferenceReply("agent");
      const mentionMsgResult = await dbInsertChatMessage(organizationId, {
        threadId,
        sender: "system",
        body: mentionReply,
        intentType: "request_status"
      });

      if (!mentionMsgResult.data?.id) {
        throw new Error("MENTION_MESSAGE_INSERT_FAILED");
      }

      await dbInsertAuditLog(organizationId, {
        entityId: threadId,
        entityType: "chat_thread",
        action: "agent_reference_received",
        actor: "System AI",
        details: `agent=${agent.role_id} requestId=${requestId}`
      });

      return {
        success: false,
        message: mentionMsgResult.data,
        webhook: { ok: false, route: "not_routed", status: 200, message: "agent mention handled as read-only reference" }
      };
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

      const dataReply = buildReadOnlyReferenceReply("data");
      const dataMsgResult = await dbInsertChatMessage(organizationId, {
        threadId,
        sender: "system",
        body: dataReply,
        intentType: "request_status"
      });

      if (!dataMsgResult.data?.id) {
        throw new Error("DATA_REFERENCE_MESSAGE_INSERT_FAILED");
      }

      await dbInsertAuditLog(organizationId, {
        entityId: threadId,
        entityType: "chat_thread",
        action: "data_reference_received",
        actor: "System AI",
        details: `refType=${refType} refKey=${refKey} requestId=${requestId}`
      });

      return {
        success: false,
        message: dataMsgResult.data,
        webhook: { ok: false, route: "not_routed", status: 200, message: "data reference handled as read-only context" }
      };
    }
    // === END @MENTION PARSER ===

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
        success: false,
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
        success: false,
        message: clarifyMsgResult.data,
        webhook: { ok: false, route: "not_routed", status: 400, message: "scope clarification requested" }
      };
    }

    // Fail-closed fallback (Should be unreachable)
    throw new Error("UNHANDLED_INTENT_REACHED_END_OF_ROUTER");
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

async function routePlanCampaignCommand(
  organizationId: string,
  threadId: string,
  requestId: string,
  auth: any,
  humanMessageId: string | undefined,
  body: string
) {
  const intentType = "plan_campaign";
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
      success: false,
      message: clarifyMsgResult.data,
      webhook: { ok: false, route: "not_routed", status: 400, message: "scope clarification requested" }
    };
  }

  const departmentScopeHint = extractDepartmentScopeHint(body);
  if (!departmentScopeHint.departmentId && !departmentScopeHint.departmentName) {
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
      details: `intent=${intentType} requestId=${requestId} reason=missing_department_id_or_registry_match`
    });

    return {
      success: false,
      message: clarifyMsgResult.data,
      webhook: { ok: false, route: "not_routed", status: 400, message: "scope clarification requested" }
    };
  }

  const departmentGovernance = await loadDepartmentGovernanceBundle();
  if (departmentGovernance.state === "blocked") {
    const blockedMsgResult = await dbInsertChatMessage(organizationId, {
      threadId,
      sender: "system",
      body: "Luồng điều phối phòng ban hiện đang bị chặn bởi governance registry. Hãy thử lại khi registry sẵn sàng.",
      intentType: "request_status"
    });

    if (!blockedMsgResult.data?.id) {
      throw new Error("GOVERNANCE_BLOCKED_MESSAGE_INSERT_FAILED");
    }

    await dbInsertAuditLog(organizationId, {
      entityId: threadId,
      entityType: "chat_thread",
      action: "department_governance_blocked",
      actor: "System AI",
      details: `intent=${intentType} requestId=${requestId} reason=${departmentGovernance.reason}`
    });

    return {
      success: false,
      message: blockedMsgResult.data,
      webhook: {
        ok: false,
        route: "not_routed",
        status: 503,
        message: departmentGovernance.reason
      }
    };
  }

  const departmentRecord = matchDepartmentRegistryRecord(
    departmentGovernance.data.registryJson.department_records,
    departmentScopeHint
  );

  if (!departmentRecord) {
    const clarifyReply =
      "Không tìm thấy phòng ban khớp registry. Hãy cung cấp department_id hoặc department_name đúng theo registry để mình route.";
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
      details: `intent=${intentType} requestId=${requestId} reason=department_registry_miss`
    });

    return {
      success: false,
      message: clarifyMsgResult.data,
      webhook: { ok: false, route: "not_routed", status: 400, message: "department registry scope not found" }
    };
  }

  const departmentPackKey = departmentRecord.department_pack_key;
  if (!departmentPackKey) {
    return {
      success: false,
      error: "DEPARTMENT_PACK_KEY_MISSING_IN_REGISTRY"
    };
  }
  const departmentPack = departmentGovernance.data.packsJson.department_packs[departmentPackKey];

  if (!departmentPack) {
    const clarifyMsgResult = await dbInsertChatMessage(organizationId, {
      threadId,
      sender: "system",
      body: `Không tìm thấy department pack khớp registry cho ${departmentRecord.department_pack}. Hãy rà soát governance bundle trước khi route tiếp.`,
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
      details: `intent=${intentType} requestId=${requestId} reason=department_pack_registry_miss`
    });

    return {
      success: false,
      message: clarifyMsgResult.data,
      webhook: { ok: false, route: "not_routed", status: 400, message: "department pack registry scope not found" }
    };
  }

  const campaignContract = buildCampaignPlanRequestContract({
    body,
    departmentRecord,
    departmentPack
  });

  const routePayload = {
    thread_id: threadId,
    threadId,
    humanMessageId,
    body,
    campaign_brief: campaignContract.campaign_brief,
    campaign_goal: campaignContract.campaign_goal,
    campaign_duration_days: campaignContract.campaign_duration_days,
    paid_media_allowed: campaignContract.paid_media_allowed,
    target_terms: campaignContract.target_terms,
    required_terms: campaignContract.required_terms,
    validation_hints: campaignContract.validation_hints,
    campaign_contract: campaignContract,
    tenantId: auth.tenantId,
    organization_id: organizationId,
    tenant_id: organizationId,
    actorId: auth.actorId,
    intent_type: intentType,
    intentType,
    routedIntent: intentType,
    department_id: departmentRecord.department_id,
    departmentId: departmentRecord.department_id,
    department_name: departmentRecord.department_name,
    departmentName: departmentRecord.department_name,
    department_pack: departmentPack,
    departmentPack: departmentPack,
    department_pack_key: departmentPackKey
  };

  let webhookPath = "webhook/human-task-intake";
  if (intentType === "plan_campaign") {
    webhookPath = "webhook/plan-campaign-intake";
  }

  const routed = await postN8nWebhook(webhookPath, routePayload);
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
    message: routedMsgResult.data ? JSON.parse(JSON.stringify(routedMsgResult.data)) : null,
    webhook: { ok: true, route: "webhook/human-task-intake", status: routed.status, message: routed.message }
  };
}
