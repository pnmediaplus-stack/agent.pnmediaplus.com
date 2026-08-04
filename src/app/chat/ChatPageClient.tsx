"use client";

import useSWR from "swr";
import { PageFrame } from "@/components/shared/PageFrame";
import { HumanCommandChat } from "@/components/chat/HumanCommandChat";
import { useI18n } from "@/lib/i18n/useI18n";
import type { ChatThread, ChatMessage } from "@/types/chat";
import type { AuditLog } from "@/types/audit";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ChatPageClient() {
  const { t } = useI18n("chat");

  const { data: threadsData, isLoading: isLoadingThreads } = useSWR<{ chat_threads: ChatThread[] }>("/api/chat-threads", fetcher);
  const thread = threadsData?.chat_threads?.[0];

  const { data: messagesData, isLoading: isLoadingMessages } = useSWR<{ chat_messages: ChatMessage[] }>(
    thread ? `/api/chat-messages?thread_id=${thread.id}` : null,
    fetcher
  );

  const { data: auditData, isLoading: isLoadingAudit } = useSWR<{ audit_logs: AuditLog[] }>("/api/audit-logs", fetcher);

  const isLoading = isLoadingThreads || (thread && isLoadingMessages) || isLoadingAudit;

  if (isLoading) {
    return (
      <PageFrame title={t("chat.page.title") ?? "Human Command Chat"} purpose="" statusLabel="Loading" statusValue="LOADING" allowedActions={[]} forbiddenActions={[]}>
        <div className="flex h-64 items-center justify-center text-white/50">Loading chat...</div>
      </PageFrame>
    );
  }

  if (!thread) {
    return (
      <PageFrame
        title={t("chat.page.title") ?? "Human Command Chat"}
        purpose={t("chat.page.purpose") ?? "Capture commands, create tasks, request clarification, and route safe actions to the right department."}
        statusLabel={t("chat.page.statusLabel") ?? "Command intake"}
        statusValue="NO_THREAD"
        allowedActions={[]}
        forbiddenActions={[]}
      >
        <div className="p-4 text-sm text-slate-400">No active thread found.</div>
      </PageFrame>
    );
  }

  // Filter audit logs for this specific thread
  const threadAuditLogs = (auditData?.audit_logs ?? []).filter(log => log.entity_id === thread.id && log.entity_type === 'chat_thread');

  return (
    <PageFrame
      title={t("chat.page.title") ?? "Human Command Chat"}
      purpose={t("chat.page.purpose") ?? "Capture commands, create tasks, request clarification, and route safe actions to the right department."}
      statusLabel={t("chat.page.statusLabel") ?? "Command intake"}
      statusValue={thread.status}
      allowedActions={[
        t("chat.page.allowed.createTaskFromMessage") ?? "Create task from message",
        t("chat.page.allowed.attachIntentType") ?? "Attach intent type",
        t("chat.page.allowed.routeToDepartment") ?? "Route to department",
        t("chat.page.allowed.requestClarification") ?? "Request clarification"
      ]}
      forbiddenActions={[
        t("chat.page.forbidden.publishNow") ?? "Publish now",
        t("chat.page.forbidden.launchNow") ?? "Launch now",
        t("chat.page.forbidden.deployProduction") ?? "Deploy production"
      ]}
    >
      <HumanCommandChat thread={thread} initialMessages={messagesData?.chat_messages ?? []} initialAuditLogs={threadAuditLogs} />
    </PageFrame>
  );
}
