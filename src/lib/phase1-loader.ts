import "server-only";

import type { Department } from "@/types/department";
import type { Agent } from "@/types/agent";
import type { Task } from "@/types/task";
import type { Artifact } from "@/types/artifact";
import type { WorkflowRun } from "@/types/workflow";
import type { QAReview } from "@/types/qa";
import type { Gate } from "@/types/gate";
import type { Approval } from "@/types/approval";
import type { ChatMessage, ChatThread } from "@/types/chat";
import type { AuditLog } from "@/types/audit";
import { getSupabaseConfig } from "./supabase-client";

const SCHEMA = "public";

type SupabaseTableResult<T> = {
  data: T[];
  error?: string;
};

async function fetchTable<T>(table: string, select = "*", orderBy = "created_at.desc"): Promise<SupabaseTableResult<T>> {
  const config = getSupabaseConfig();

  if (!config) {
    return { data: [], error: "SUPABASE_ENV_MISSING" };
  }

  try {
    const endpoint = new URL(`${config.url.replace(/\/$/, "")}/rest/v1/${table}`);
    endpoint.searchParams.set("select", select);
    endpoint.searchParams.set("order", orderBy);

    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        Accept: "application/json",
        "Accept-Profile": SCHEMA,
        "Content-Profile": SCHEMA
      }
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return {
        data: [],
        error: `Supabase ${table} query failed (${response.status}): ${body || response.statusText}`
      };
    }

    const payload = (await response.json()) as T[];
    return { data: payload };
  } catch (error) {
    return {
      data: [],
      error: `Supabase ${table} fetch failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

async function insertRow<T>(table: string, payload: Partial<T>): Promise<{ data: T | null; error?: string }> {
  const config = getSupabaseConfig();
  if (!config) return { data: null, error: "SUPABASE_ENV_MISSING" };

  try {
    const endpoint = new URL(`${config.url.replace(/\/$/, "")}/rest/v1/${table}`);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
        "Content-Profile": SCHEMA
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { data: null, error: `Supabase ${table} insert failed (${response.status}): ${body || response.statusText}` };
    }

    const json = await response.json();
    return { data: Array.isArray(json) ? json[0] : json };
  } catch (error) {
    return { data: null, error: `Supabase ${table} insert failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

async function deleteRow(table: string, id: string): Promise<{ success: boolean; error?: string }> {
  const config = getSupabaseConfig();
  if (!config) return { success: false, error: "SUPABASE_ENV_MISSING" };

  try {
    const endpoint = new URL(`${config.url.replace(/\/$/, "")}/rest/v1/${table}`);
    endpoint.searchParams.set("id", `eq.${id}`);

    const response = await fetch(endpoint, {
      method: "DELETE",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        "Content-Profile": SCHEMA
      }
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { success: false, error: `Supabase ${table} delete failed (${response.status}): ${body || response.statusText}` };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: `Supabase ${table} delete failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function loadDepartments() {
  return fetchTable<Department>("phase1_departments");
}

export async function loadAgents() {
  return fetchTable<Agent>("phase1_agents");
}

export async function loadTasks() {
  return fetchTable<Task>("phase1_tasks", "*", "createdAt.desc");
}

export async function loadArtifacts() {
  return fetchTable<Artifact>("phase1_artifacts", "*", "updatedAt.desc");
}

export async function loadWorkflowRuns() {
  return fetchTable<WorkflowRun>("phase1_workflow_runs", "*", "startedAt.desc");
}

export async function loadQaReviews() {
  return fetchTable<QAReview>("phase1_qa_reviews", "*", "reviewedAt.desc");
}

export async function loadGates() {
  return fetchTable<Gate>("phase1_gates", "*", "id.asc");
}

export async function loadApprovals() {
  return fetchTable<Approval>("phase1_approvals", "*", "requestedAt.desc");
}

export async function loadChatThreads() {
  return fetchTable<ChatThread>("phase1_chat_threads", "*", "lastActivityAt.desc");
}

export async function loadChatMessages(threadId: string) {
  const config = getSupabaseConfig();
  if (!config) return { data: [], error: "SUPABASE_ENV_MISSING" };
  
  try {
    const endpoint = new URL(`${config.url.replace(/\/$/, "")}/rest/v1/phase1_chat_messages`);
    endpoint.searchParams.set("select", "*");
    endpoint.searchParams.set("threadId", `eq.${threadId}`);
    endpoint.searchParams.set("order", "createdAt.asc");

    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        Accept: "application/json",
        "Accept-Profile": SCHEMA
      }
    });

    if (!response.ok) throw new Error(await response.text());
    return { data: (await response.json()) as ChatMessage[] };
  } catch (error) {
    return { data: [], error: String(error) };
  }
}

export async function loadAuditLogs() {
  return fetchTable<AuditLog>("phase1_audit_logs", "*", "createdAt.desc");
}

export async function loadThreadAuditLogs(threadId: string) {
  const config = getSupabaseConfig();
  if (!config) return { data: [], error: "SUPABASE_ENV_MISSING" };
  
  try {
    const endpoint = new URL(`${config.url.replace(/\/$/, "")}/rest/v1/phase1_audit_logs`);
    endpoint.searchParams.set("select", "*");
    endpoint.searchParams.set("entityId", `eq.${threadId}`);
    endpoint.searchParams.set("entityType", `eq.chat`);
    endpoint.searchParams.set("order", "createdAt.asc");

    const response = await fetch(endpoint, {
      cache: "no-store",
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        Accept: "application/json",
        "Accept-Profile": SCHEMA
      }
    });

    if (!response.ok) throw new Error(await response.text());
    return { data: (await response.json()) as AuditLog[] };
  } catch (error) {
    return { data: [], error: String(error) };
  }
}

export async function insertChatMessage(payload: Omit<ChatMessage, "id" | "createdAt">) {
  return insertRow<ChatMessage>("phase1_chat_messages", payload);
}

export async function insertAuditLog(payload: Omit<AuditLog, "id" | "createdAt">) {
  return insertRow<AuditLog>("phase1_audit_logs", payload);
}

export async function deleteChatMessage(id: string) {
  return deleteRow("phase1_chat_messages", id);
}

export async function deleteAuditLog(id: string) {
  return deleteRow("phase1_audit_logs", id);
}
