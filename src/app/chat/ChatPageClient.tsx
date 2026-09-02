"use client";

import { useState } from "react";
import useSWR, { mutate } from "swr";
import { PageFrame } from "@/components/shared/PageFrame";
import { HumanCommandChat } from "@/components/chat/HumanCommandChat";
import { useI18n } from "@/lib/i18n/useI18n";
import type { ChatThread, ChatMessage } from "@/types/chat";
import type { AuditLog } from "@/types/audit";
import { createNewChatThread, renameChatThread, deleteChatThread } from "@/app/actions/chat-actions";
import { Plus, Pencil, Trash2 } from "lucide-react";

const fetcher = (url: string) => fetch(url, { cache: 'no-store' }).then((res) => res.json());

export function ChatPageClient() {
  const { t } = useI18n("chat");
  const [isCreating, setIsCreating] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const { data: threadsData, isLoading: isLoadingThreads } = useSWR<{ chat_threads: ChatThread[] }>("/api/chat-threads", fetcher);
  
  // If activeThreadId is set, strictly use it (even if not in cache yet). Otherwise default to [0].
  const thread = activeThreadId 
    ? threadsData?.chat_threads?.find((t) => t.id === activeThreadId) 
    : threadsData?.chat_threads?.[0];

  const { data: messagesData, isLoading: isLoadingMessages } = useSWR<{ chat_messages: ChatMessage[] }>(
    thread ? `/api/chat-messages?thread_id=${thread.id}` : null,
    fetcher,
    { keepPreviousData: true }
  );

  const { data: auditData, isLoading: isLoadingAudit } = useSWR<{ audit_logs: AuditLog[] }>(
    thread ? `/api/audit-logs?entity_id=${thread.id}` : null,
    fetcher,
    { keepPreviousData: true }
  );

  const handleNewChat = async () => {
    const title = window.prompt("Nhập tên cho phiên làm việc mới (để trống sẽ dùng tên mặc định):");
    if (title === null) return; // User cancelled

    setIsCreating(true);
    try {
      const result = await createNewChatThread(title.trim() || undefined);
      if (result.success && result.threadId) {
        setActiveThreadId(result.threadId);
        await mutate("/api/chat-threads");
      } else {
        console.error("Failed to create new chat:", result.error);
        alert("Có lỗi xảy ra khi tạo phiên làm việc mới.");
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleRenameChat = async () => {
    if (!thread) return;
    const newTitle = window.prompt("Đổi tên phiên làm việc:", thread.title);
    if (newTitle === null || newTitle.trim() === "" || newTitle === thread.title) return;

    try {
      const result = await renameChatThread(thread.id, newTitle.trim());
      if (result.success) {
        await mutate("/api/chat-threads");
      } else {
        alert("Có lỗi xảy ra khi đổi tên phiên làm việc.");
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi đổi tên.");
    }
  };

  const handleDeleteChat = async () => {
    if (!thread) return;
    const confirm = window.confirm("Bạn có chắc chắn muốn xóa phiên làm việc này không? Phiên sẽ bị đóng và ẩn khỏi danh sách.");
    if (!confirm) return;

    try {
      const result = await deleteChatThread(thread.id);
      if (result.success) {
        setActiveThreadId(null);
        await mutate("/api/chat-threads");
      } else {
        alert("Có lỗi xảy ra khi xóa phiên làm việc.");
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi xóa.");
    }
  };

  // Filter audit logs for this specific thread
  const threadAuditLogs = (auditData?.audit_logs ?? []).filter(log => log.entity_id === thread?.id && log.entity_type === 'chat_thread');

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
        <div className="p-4 flex flex-col items-center justify-center space-y-4">
          <div className="text-sm text-slate-500 dark:text-slate-400">Không tìm thấy luồng nào đang hoạt động.</div>
          <button
            onClick={handleNewChat}
            disabled={isCreating}
            className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white rounded-md text-sm transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>{isCreating ? "Đang tạo..." : "Tạo phiên làm việc mới"}</span>
          </button>
        </div>
      </PageFrame>
    );
  }

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
      <div className="mb-4 flex items-center justify-between">
        <div className="flex flex-col">
          <label className="text-xs text-slate-500 mb-1">Lịch sử phiên làm việc</label>
          <div className="flex items-center space-x-2">
            <select
              value={thread.id}
              onChange={(e) => setActiveThreadId(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-300 text-xs rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-sm cursor-pointer"
            >
              {threadsData?.chat_threads?.map(t => {
                const dateObj = new Date(t.created_at);
                const dateStr = dateObj.toLocaleString('vi-VN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
                return (
                  <option key={t.id} value={t.id} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-300">
                    {dateStr} - {t.title || 'Phiên làm việc'}
                  </option>
                );
              })}
            </select>
            <button
              onClick={handleRenameChat}
              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-900 dark:text-white rounded transition-colors"
              title="Đổi tên phiên làm việc hiện tại"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDeleteChat}
              className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-900/40 border border-slate-300 dark:border-slate-700 hover:border-red-300 dark:hover:border-red-800 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
              title="Xóa phiên làm việc hiện tại"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <button
          onClick={handleNewChat}
          disabled={isCreating}
          className="flex items-center space-x-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-700/20 hover:bg-emerald-100 dark:hover:bg-emerald-700/40 border border-emerald-200 dark:border-emerald-700/50 text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 rounded text-xs transition-colors disabled:opacity-50 mt-4"
          title="Tạo phiên chat mới để tẩy xóa hoàn toàn bộ nhớ của AI Orchestrator"
        >
          <Plus className="w-4 h-4" />
          <span>{isCreating ? "Đang tạo..." : "Tạo phiên mới"}</span>
        </button>
      </div>
      <HumanCommandChat thread={thread} initialMessages={messagesData?.chat_messages ?? []} initialAuditLogs={threadAuditLogs} />
    </PageFrame>
  );
}
