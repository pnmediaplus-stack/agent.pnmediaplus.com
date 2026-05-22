"use client";

import { PageFrame } from "@/components/shared/PageFrame";
import { HumanCommandChat } from "@/components/chat/HumanCommandChat";
import { useI18n } from "@/lib/i18n/useI18n";
import { chatMessages, chatThreads, auditLogs } from "@/lib/mock-data";

export default function ChatPage() {
  const thread = chatThreads[0];
  const { t } = useI18n("chat");

  return (
    <PageFrame
      title={t("chat.page.title") ?? "Human Command Chat"}
      purpose={t("chat.page.purpose") ?? "Capture commands, create mock tasks, request clarification, and route safe actions to the right department."}
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
      <HumanCommandChat thread={thread} initialMessages={chatMessages} initialAuditLogs={auditLogs} />
    </PageFrame>
  );
}
