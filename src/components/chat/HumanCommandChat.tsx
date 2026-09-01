"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { ChatComposer } from "@/components/chat/ChatComposer";
import type { VisualAsset } from "@/types/artifact";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { DraftContentModal } from "@/components/chat/DraftContentModal";
import { useI18n } from "@/lib/i18n/useI18n";
import { sendChatMessage, pollActiveTasks } from "@/app/actions/chat-actions";
import type { ChatMessage, ChatThread } from "@/types/chat";
import type { AuditLog } from "@/types/audit";
import {
  Loader2, CheckCircle2, Clock, History,
  ChevronDown, ChevronUp, Activity, XCircle, HelpCircle
} from "lucide-react";

type HumanCommandChatProps = {
  thread: ChatThread;
  initialMessages: ChatMessage[];
  initialAuditLogs: AuditLog[];
};

export function HumanCommandChat({ thread, initialMessages, initialAuditLogs }: HumanCommandChatProps) {
  const [modalDraft, setModalDraft] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs);
  const [activeTasks, setActiveTasks] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isContentModalOpen, setIsContentModalOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const { t: tChat } = useI18n("chat");
  const { t: tShared } = useI18n("shared");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages.length, isSending]);

  useEffect(() => {
    let mounted = true;
    let inFlight = false;
    const interval = setInterval(async () => {
      if (inFlight) return;
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        const [messagesRes, logsRes, latestTasks] = await Promise.all([
          fetch(`/api/chat-messages?thread_id=${thread.id}`, { cache: "no-store" }).then((r) => r.json()),
          fetch(`/api/audit-logs?entity_id=${thread.id}`, { cache: "no-store" }).then((r) => r.json()),
          pollActiveTasks(),
        ]);
        if (mounted) {
          if (messagesRes.chat_messages) setMessages(messagesRes.chat_messages);
          if (logsRes.audit_logs) setAuditLogs(logsRes.audit_logs);
          setActiveTasks(latestTasks);
        }
      } catch (err) {
        console.error("Polling error:", err);
      } finally {
        inFlight = false;
      }
    }, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [thread.id]);

  const summary = useMemo(() => {
    const latest = messages[messages.length - 1];
    return latest?.body ?? (tChat("chat.summary.latestFallback"));
  }, [messages, tChat]);

  async function handleSubmit(text: string, visual_assets: VisualAsset[] = []) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    setIsSending(true);
    setSendError(null);
    const optimisticMessage: any = {
      id: `optimistic-${Date.now()}`,
      thread_id: thread.id,
      sender: "human",
      body: trimmed,
      intent_type: "unknown",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    try {
      const result = await sendChatMessage(thread.id, trimmed, visual_assets);
      if (result?.error) throw new Error(result.error);
      const [messagesRes, logsRes, latestTasks] = await Promise.all([
        fetch(`/api/chat-messages?thread_id=${thread.id}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/audit-logs?entity_id=${thread.id}`, { cache: "no-store" }).then((r) => r.json()),
        pollActiveTasks(),
      ]);
      if (messagesRes.chat_messages) setMessages(messagesRes.chat_messages);
      if (logsRes.audit_logs) setAuditLogs(logsRes.audit_logs);
      setActiveTasks(latestTasks);
    } catch (err) {
      console.error("Failed to send message", err);
      setSendError(err instanceof Error ? err.message : "Failed to send message");
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
    } finally {
      setIsSending(false);
    }
  }

  async function handleDirectSubmit(contentItemId: string, title: string) {
    if (isSending) return;
    setIsContentModalOpen(false);
    setIsSending(true);
    setSendError(null);
    const commandStr = `/auto_content ${contentItemId} ${title}`;
    const optimisticMessage: any = {
      id: `optimistic-${Date.now()}`,
      thread_id: thread.id,
      sender: "human",
      body: commandStr,
      intent_type: "unknown",
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    try {
      const result = await sendChatMessage(thread.id, commandStr);
      if (result?.error) throw new Error(result.error);
      const [messagesRes, logsRes, latestTasks] = await Promise.all([
        fetch(`/api/chat-messages?thread_id=${thread.id}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/audit-logs?entity_id=${thread.id}`, { cache: "no-store" }).then((r) => r.json()),
        pollActiveTasks(),
      ]);
      if (messagesRes.chat_messages) setMessages(messagesRes.chat_messages);
      if (logsRes.audit_logs) setAuditLogs(logsRes.audit_logs);
      setActiveTasks(latestTasks);
    } catch (err) {
      console.error("Failed to send message", err);
      setSendError(err instanceof Error ? err.message : "Failed to send message");
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
    } finally {
      setIsSending(false);
    }
  }

  const handleCommand = useCallback(
    async (cmd: string) => {
      setIsSending(true);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          organization_id: thread.organization_id,
          thread_id: thread.id,
          sender: "human",
          body: cmd,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any,
      ]);
      try {
        const result = await sendChatMessage(thread.id, cmd);
        if (result?.error) throw new Error(result.error);
      } catch (e: any) {
        console.error(e);
      } finally {
        setIsSending(false);
      }
    },
    [thread.id, thread.organization_id]
  );

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_320px]" style={{ height: "calc(100vh - 120px)" }}>
      {/* ── Left column: Chat ── */}
      <div className="flex flex-col h-full min-h-0 min-w-0">
        
        {/* Active Tasks Banner */}
        {activeTasks.length > 0 && (
          <div className="shrink-0 mb-4 rounded-2xl border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50/80 dark:bg-indigo-950/50 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 text-indigo-500 animate-spin" />
              <span className="text-[11px] uppercase tracking-widest font-semibold text-indigo-500 dark:text-indigo-400">
                {tChat("chat.active_tasks")}
              </span>
              <span className="ml-auto text-[11px] font-mono text-indigo-400 bg-indigo-100 dark:bg-indigo-500/20 rounded-full px-2 py-0.5">
                {activeTasks.length}
              </span>
            </div>
          </div>
        )}

        {/* Collapsible Thread Summary */}
        <div className="shrink-0 mb-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setSummaryOpen((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
          >
            <span className="text-[11px] uppercase tracking-widest font-semibold text-slate-400">
              {tChat("chat.summary.title")}
            </span>
            {summaryOpen ? (
              <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            )}
          </button>
          {summaryOpen && (
            <div className="px-4 pb-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-2.5 bg-slate-50/50 dark:bg-transparent">
              {summary}
            </div>
          )}
        </div>

        {/* Error Banner */}
        {sendError && (
          <div className="shrink-0 mb-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 px-4 py-2.5 text-sm text-rose-700 dark:text-rose-300">
            {sendError}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 min-h-0 overflow-y-auto px-1 py-2">
          <ChatMessageList messages={messages} isTyping={isSending} onCommand={handleCommand} />
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div className="shrink-0 mt-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-1">
          <ChatComposer
            onSubmit={handleSubmit}
            onRequestCreateTask={(currentDraft) => {
              setModalDraft(currentDraft);
              setIsContentModalOpen(true);
            }}
          />
        </div>
      </div>

      {/* ── Right column: Thread info + Audit ── */}
      <div className="flex flex-col h-full min-h-0 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm overflow-hidden">
        {/* Thread Info */}
        <div className="shrink-0 border-b border-slate-100 dark:border-slate-800 px-5 py-4 bg-slate-50/50 dark:bg-transparent">
          <div className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">{thread.title}</div>
          <p className="mt-1.5 text-xs leading-5 text-slate-400 dark:text-slate-500">{thread.purpose}</p>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest font-mono text-slate-400">
              {tShared("shared.thread.status")}
            </span>
            {(() => {
              const status = (thread.status || "").toUpperCase();
              let bg = "bg-slate-100 dark:bg-slate-800";
              let text = "text-slate-600 dark:text-slate-400";
              let Icon = HelpCircle;
              
              if (status === "ACTIVE") {
                bg = "bg-emerald-50 dark:bg-emerald-500/10";
                text = "text-emerald-600 dark:text-emerald-400";
                Icon = Activity;
              } else if (status === "PENDING" || status === "WAITING") {
                bg = "bg-amber-50 dark:bg-amber-500/10";
                text = "text-amber-600 dark:text-amber-400";
                Icon = Clock;
              } else if (status === "FAILED" || status === "ERROR") {
                bg = "bg-rose-50 dark:bg-rose-500/10";
                text = "text-rose-600 dark:text-rose-400";
                Icon = XCircle;
              } else if (status === "CLOSED" || status === "COMPLETED" || status === "DONE") {
                bg = "bg-blue-50 dark:bg-blue-500/10";
                text = "text-blue-600 dark:text-blue-400";
                Icon = CheckCircle2;
              }
              
              return (
                <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${bg} ${text}`}>
                  <Icon className="h-3 w-3" />
                  {thread.status}
                </span>
              );
            })()}
          </div>
        </div>

        {/* Audit Trail */}
        <div className="flex flex-col flex-1 min-h-0 p-4">
          <div className="flex flex-col flex-1 min-h-0 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="shrink-0 flex items-center gap-2 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
              <History className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              <span className="text-xs uppercase tracking-widest font-bold text-slate-700 dark:text-slate-300">
                {tChat("chat.audit.label")}
              </span>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2 pr-2">
            {auditLogs.length === 0 && (
              <div className="text-xs text-slate-400 text-center pt-6">—</div>
            )}
            {auditLogs.map((log) => (
              <div
                key={log.id}
                className="rounded-lg border border-slate-100 dark:border-slate-800/80 bg-slate-50 dark:bg-slate-900/40 p-2.5"
              >
                {/* Action type badge */}
                <div className="inline-flex items-center rounded bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.5">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                    {log.action_type}
                  </span>
                </div>

                {/* Metadata */}
                <div className="mt-1.5 text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                  {log.metadata ? (
                    <>
                      {log.metadata.reason && (
                        <div className="flex gap-1.5">
                          <span className="shrink-0 text-slate-400">{tChat("chat.log.detail")}</span>
                          <span className="break-all">{log.metadata.reason}</span>
                        </div>
                      )}
                      {log.metadata.before && log.metadata.after && (
                        <div className="flex items-center gap-1 font-mono text-[10px]">
                          <span className="text-slate-400">{tChat("chat.log.state_change")}</span>
                          <span className="bg-slate-200 dark:bg-slate-700 rounded px-1">{log.metadata.before}</span>
                          <span className="text-slate-400">→</span>
                          <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded px-1">{log.metadata.after}</span>
                        </div>
                      )}
                      {!log.metadata.reason && !log.metadata.before && (
                        <div className="font-mono text-[10px] break-all text-slate-400">
                          {JSON.stringify(log.metadata)}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
      </div>

      {isContentModalOpen && (
        <DraftContentModal
          initialTitle={modalDraft}
          onClose={() => setIsContentModalOpen(false)}
          onSuccess={handleDirectSubmit}
        />
      )}
    </div>
  );
}
