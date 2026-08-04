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

export async function dbInsertChatMessage(organizationId: string, message: { threadId: string; sender: "human" | "agent" | "system"; body: string; intentType?: string }) {
  const res = await fetch(`${supabaseUrl}/rest/v1/chat_messages`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Prefer': 'return=representation' },
    body: JSON.stringify({
      organization_id: organizationId,
      thread_id: message.threadId,
      sender: message.sender,
      body: message.body,
      intent_type: message.intentType
    })
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return { data: data[0] };
}

export async function dbInsertAuditLog(organizationId: string, log: { entityId: string; entityType: string; action: string; actor: string; details: string }) {
  const res = await fetch(`${supabaseUrl}/rest/v1/audit_logs`, {
    method: 'POST',
    headers: { ...getHeaders(), 'Prefer': 'return=representation' },
    body: JSON.stringify({
      organization_id: organizationId,
      entity_type: log.entityType,
      entity_id: log.entityId,
      action_type: log.action,
      actor_type: log.actor,
      metadata: { details: log.details }
    })
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return { data: data[0] };
}

export async function dbLoadChatMessages(organizationId: string, threadId: string) {
  const res = await fetch(`${supabaseUrl}/rest/v1/chat_messages?organization_id=eq.${organizationId}&thread_id=eq.${threadId}&order=created_at.asc`, {
    headers: getHeaders(),
    cache: 'no-store'
  });
  if (!res.ok) return { error: await res.text(), data: [] };
  const data = await res.json();
  return { data: data as ChatMessage[] };
}

export async function dbLoadThreadAuditLogs(organizationId: string, threadId: string) {
  const res = await fetch(`${supabaseUrl}/rest/v1/audit_logs?organization_id=eq.${organizationId}&entity_id=eq.${threadId}&entity_type=eq.chat_thread&order=created_at.desc`, {
    headers: getHeaders(),
    cache: 'no-store'
  });
  if (!res.ok) return { error: await res.text(), data: [] };
  const data = await res.json();
  return { data: data as AuditLog[] };
}

export async function dbDeleteChatMessage(organizationId: string, messageId: string) {
  const res = await fetch(`${supabaseUrl}/rest/v1/chat_messages?organization_id=eq.${organizationId}&id=eq.${messageId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function dbDeleteAuditLog(organizationId: string, logId: string) {
  const res = await fetch(`${supabaseUrl}/rest/v1/audit_logs?organization_id=eq.${organizationId}&id=eq.${logId}`, {
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
