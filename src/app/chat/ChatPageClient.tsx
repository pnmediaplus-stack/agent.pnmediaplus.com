"use client";

import { PageFrame } from "@/components/shared/PageFrame";
import { HumanCommandChat } from "@/components/chat/HumanCommandChat";
import { useI18n } from "@/lib/i18n/useI18n";
import type { ChatThread, ChatMessage } from "@/types/chat";
import type { AuditLog } from "@/types/audit";

export function ChatPageClient({ 
  thread, 
  messages, 
  auditLogs 
}: { 
  thread?: ChatThread;
  messages: ChatMessage[];
  auditLogs: AuditLog[];
}) {
  const { t } = useI18n("chat");

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
      <HumanCommandChat thread={thread} initialMessages={messages} initialAuditLogs={auditLogs} />
    </PageFrame>
  );
}
