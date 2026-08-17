import "server-only";
import type { ChatMessage } from "@/types/chat";
import type { AuditLog } from "@/types/audit";
import type { Task } from "@/types/task";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getHeaders() {
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");
  return {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Accept-Profile': 'pn_os_ai_department',
    'Content-Type': 'application/json'
  };
}

function getPublicHeaders() {
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");
  return {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Accept-Profile': 'public',
    'Content-Type': 'application/json'
  };
}

export async function dbInsertChatMessage(organizationId: string, message: { threadId: string; sender: "human" | "agent" | "system"; body: string; intentType?: string }) {
  const res = await fetch(`${supabaseUrl}/rest/v1/phase1_chat_messages`, {
    method: 'POST',
    headers: { ...getPublicHeaders(), 'Prefer': 'return=representation' },
    body: JSON.stringify({
      threadId: message.threadId,
      sender: message.sender,
      body: message.body,
      intentType: message.intentType
    })
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return { data: data[0] };
}

export async function dbInsertAuditLog(organizationId: string, log: { entityId: string; entityType: string; action: string; actor: string; details: string }) {
  const res = await fetch(`${supabaseUrl}/rest/v1/phase1_audit_logs`, {
    method: 'POST',
    headers: { ...getPublicHeaders(), 'Prefer': 'return=representation' },
    body: JSON.stringify({
      entityId: log.entityId,
      entityType: log.entityType,
      action: log.action,
      actor: log.actor,
      details: log.details
    })
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return { data: data[0] };
}

export async function dbLoadChatMessages(organizationId: string, threadId: string) {
  const res = await fetch(`${supabaseUrl}/rest/v1/chat_message_feed_v1?threadId=eq.${threadId}&order=createdAt.asc`, {
    headers: getHeaders(),
    cache: 'no-store'
  });
  if (!res.ok) return { error: await res.text(), data: [] };
  const data = await res.json();
  return { data: data as ChatMessage[] };
}

export async function dbLoadThreadAuditLogs(organizationId: string, threadId: string) {
  const res = await fetch(`${supabaseUrl}/rest/v1/audit_log_feed_v1?entityId=eq.${threadId}&entityType=eq.chat&order=createdAt.desc`, {
    headers: getHeaders(),
    cache: 'no-store'
  });
  if (!res.ok) return { error: await res.text(), data: [] };
  const data = await res.json();
  return { data: data as AuditLog[] };
}

export async function dbDeleteChatMessage(organizationId: string, messageId: string) {
  const res = await fetch(`${supabaseUrl}/rest/v1/chat_messages?id=eq.${messageId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function dbDeleteAuditLog(organizationId: string, logId: string) {
  const res = await fetch(`${supabaseUrl}/rest/v1/audit_logs?id=eq.${logId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function dbLoadActiveTasks(organizationId: string, actorId: string) {
  const res = await fetch(`${supabaseUrl}/rest/v1/tasks?organization_id=eq.${organizationId}&status=in.("PENDING","IN_PROGRESS")&order=created_at.desc`, {
    headers: getHeaders(),
    cache: 'no-store'
  });
  if (!res.ok) return { error: await res.text(), data: [] };
  const data = await res.json();
  return { data: data as Task[] };
}

export async function dbUpdateTask(organizationId: string, taskId: string, payload: any) {
  const res = await fetch(`${supabaseUrl}/rest/v1/tasks?organization_id=eq.${organizationId}&id=eq.${taskId}`, {
    method: 'PATCH',
    headers: { ...getHeaders(), 'Prefer': 'return=representation' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) return { error: await res.text(), data: null };
  const data = await res.json();
  return { data: data[0] };
}

export async function dbLoadContextData(organizationId: string, referenceType: 'content' | 'idea', referenceKey: string) {
  let query = '';
  if (referenceType === 'content') {
    query = `id=eq.${referenceKey}`;
  } else {
    query = `content_key=eq.${referenceKey}`;
  }

  const res = await fetch(`${supabaseUrl}/rest/v1/phase2_content_items?${query}&organization_id=eq.${organizationId}`, {
    headers: getPublicHeaders(),
    cache: 'no-store'
  });
  if (!res.ok) return { error: await res.text(), data: null };
  const data = await res.json();
  return { data: data[0] || null };
}

export async function dbCreateContentItemFromBrief(organizationId: string, brief: string, ownerRef: string, campaignId?: string | null) {
  const trimmedBrief = brief.trim();
  let title = trimmedBrief.substring(0, 50).trim();
  if (!title) {
    title = 'Idea from Chat ' + new Date().toISOString().split('T')[0];
  } else if (trimmedBrief.length > 50) {
    title += '...';
  }

  const bodyData: any = {
    organization_id: organizationId,
    content_key: 'auto_' + crypto.randomUUID().replace(/-/g, ''),
    owner_ref: ownerRef,
    title: title,
    brief: trimmedBrief,
    state: 'idea'
  };
  if (campaignId) bodyData.campaign_id = campaignId;

  const res = await fetch(`${supabaseUrl}/rest/v1/phase2_content_items`, {
    method: 'POST',
    headers: { ...getPublicHeaders(), 'Prefer': 'return=representation' },
    body: JSON.stringify(bodyData)
  });
  
  if (!res.ok) {
    return { error: await res.text(), data: null };
  }
  const data = await res.json();
  return { data: data[0] };
}

export async function dbResolveActiveCampaign(organizationId: string, threadId: string, explicitIdentifier: string | null) {
  // 1. Explicit identifier provided
  if (explicitIdentifier) {
    let url = `${supabaseUrl}/rest/v1/campaigns?organization_id=eq.${organizationId}&select=*&limit=1`;
    // Check if it's a UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(explicitIdentifier)) {
      url += `&id=eq.${explicitIdentifier}`;
    } else {
      url += `&name=ilike.*${encodeURIComponent(explicitIdentifier)}*`;
    }
    const res = await fetch(url, { headers: getPublicHeaders() });
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) return { campaign: data[0] };
    }
    return { error: 'explicit_not_found', message: `Không tìm thấy chiến dịch nào khớp với "${explicitIdentifier}".` };
  }

  // 2. Check thread's active_campaign_id
  const threadRes = await fetch(`${supabaseUrl}/rest/v1/phase1_chat_threads?id=eq.${threadId}&select=active_campaign_id`, { headers: getPublicHeaders() });
  if (threadRes.ok) {
    const threadData = await threadRes.json();
    if (threadData && threadData.length > 0 && threadData[0].active_campaign_id) {
      const campRes = await fetch(`${supabaseUrl}/rest/v1/campaigns?id=eq.${threadData[0].active_campaign_id}&select=*`, { headers: getPublicHeaders() });
      if (campRes.ok) {
        const campData = await campRes.json();
        if (campData && campData.length > 0) return { campaign: campData[0] };
      }
    }
  }

  // 3. Fallback to Single Active Campaign check
  const activeRes = await fetch(`${supabaseUrl}/rest/v1/campaigns?organization_id=eq.${organizationId}&status=eq.active&select=*`, { headers: getPublicHeaders() });
  if (activeRes.ok) {
    const activeData = await activeRes.json();
    if (activeData && activeData.length === 1) {
      return { campaign: activeData[0] };
    } else if (activeData && activeData.length > 1) {
      return { error: 'multiple_active', message: 'Hệ thống tìm thấy nhiều chiến dịch đang hoạt động. Vui lòng chỉ định rõ bằng lệnh: --campaign="Tên Chiến Dịch"' };
    }
  }

  // 4. No active campaigns, proceed with minimal context (return null)
  return { campaign: null };
}

export async function dbUpdateThreadCampaign(organizationId: string, threadId: string, campaignId: string) {
  // 1. Verify ownership
  const checkRes = await fetch(`${supabaseUrl}/rest/v1/chat_threads?id=eq.${threadId}&select=department_id`, {
    headers: getPublicHeaders()
  });
  if (!checkRes.ok) return { error: 'FAILED_TO_CHECK_THREAD' };
  const checkData = await checkRes.json();
  if (!checkData || checkData.length === 0) return { error: 'THREAD_NOT_FOUND' };

  const deptRes = await fetch(`${supabaseUrl}/rest/v1/departments?id=eq.${checkData[0].department_id}&organization_id=eq.${organizationId}&select=id`, {
    headers: getPublicHeaders()
  });
  if (!deptRes.ok) return { error: 'FAILED_TO_CHECK_DEPT' };
  const deptData = await deptRes.json();
  if (!deptData || deptData.length === 0) return { error: 'UNAUTHORIZED_TENANT' };

  // 2. Perform Update
  const res = await fetch(`${supabaseUrl}/rest/v1/chat_threads?id=eq.${threadId}`, {
    method: 'PATCH',
    headers: {
      ...getPublicHeaders(),
      'Content-Profile': 'pn_os_ai_department',
      'Prefer': 'return=minimal'
    },
    body: JSON.stringify({ active_campaign_id: campaignId })
  });

  if (!res.ok) {
    return { error: await res.text() };
  }
  return { error: null };
}
