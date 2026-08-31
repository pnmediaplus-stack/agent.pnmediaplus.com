"use client";

import useSWR from "swr";
import { PageFrame } from "@/components/shared/PageFrame";
import { HumanCommandChat } from "@/components/chat/HumanCommandChat";
import { useI18n } from "@/lib/i18n/useI18n";
import type { ChatThread, ChatMessage } from "@/types/chat";
import type { AuditLog } from "@/types/audit";

const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then((res) => res.json());

export function ChatPageClient() {
  const { t } = useI18n("chat");

  const { data: threadsData, isLoading: isLoadingThreads } = useSWR<{ chat_threads: ChatThread[] }>("/api/chat-threads", fetcher);
  const thread = threadsData?.chat_threads?.[0];

  const { data: messagesData, isLoading: isLoadingMessages } = useSWR<{ chat_messages: ChatMessage[] }>(
    thread ? `/api/chat-messages?thread_id=${thread.id}` : null,
    fetcher
  );

  const { data: auditData, isLoading: isLoadingAudit } = useSWR<{ audit_logs: AuditLog[] }>(
    thread ? `/api/audit-logs?entity_id=${thread.id}` : null,
    fetcher
  );

  const isLoading = isLoadingThreads || (thread && isLoadingMessages) || (thread && isLoadingAudit);

  if (isLoading) {
    return (
      <PageFrame title={t("chat.page.title") ?? "Trò chuyện mệnh lệnh Human"} purpose="" statusLabel="Đang tải" statusValue="LOADING" allowedActions={[]} forbiddenActions={[]}>
        <div className="flex h-64 items-center justify-center text-white/50">Đang tải trò chuyện...</div>
      </PageFrame>
    );
  }

  if (!thread) {
    return (
      <PageFrame
        title={t("chat.page.title") ?? "Trò chuyện mệnh lệnh Human"}
        purpose={t("chat.page.purpose") ?? "Tiếp nhận lệnh, tạo tác vụ, yêu cầu làm rõ, và định tuyến các hành động an toàn đến đúng phòng ban."}
        statusLabel={t("chat.page.statusLabel") ?? "Tiếp nhận lệnh"}
        statusValue="NO_THREAD"
        allowedActions={[]}
        forbiddenActions={[]}
      >
        <div className="p-4 text-sm text-slate-400">Không tìm thấy luồng nào đang hoạt động.</div>
      </PageFrame>
    );
  }

  // Filter audit logs for this specific thread
  const threadAuditLogs = (auditData?.audit_logs ?? []).filter(log => log.entity_id === thread.id && log.entity_type === 'chat_thread');

  return (
    <PageFrame
      title={t("chat.page.title") ?? "Trò chuyện mệnh lệnh Human"}
      purpose={t("chat.page.purpose") ?? "Tiếp nhận lệnh, tạo tác vụ, yêu cầu làm rõ, và định tuyến các hành động an toàn đến đúng phòng ban."}
      statusLabel={t("chat.page.statusLabel") ?? "Tiếp nhận lệnh"}
      statusValue={thread.status}
      allowedActions={[
        t("chat.page.allowed.createTaskFromMessage") ?? "Tạo tác vụ từ tin nhắn",
        t("chat.page.allowed.attachIntentType") ?? "Đính kèm loại ý định",
        t("chat.page.allowed.routeToDepartment") ?? "Định tuyến đến phòng ban",
        t("chat.page.allowed.requestClarification") ?? "Yêu cầu làm rõ"
      ]}
      forbiddenActions={[
        t("chat.page.forbidden.publishNow") ?? "Xuất bản ngay",
        t("chat.page.forbidden.launchNow") ?? "Khởi chạy ngay",
        t("chat.page.forbidden.deployProduction") ?? "Triển khai Production"
      ]}
    >
      <HumanCommandChat thread={thread} initialMessages={messagesData?.chat_messages ?? []} initialAuditLogs={threadAuditLogs} />
    </PageFrame>
  );
}
