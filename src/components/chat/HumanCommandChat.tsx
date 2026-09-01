"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { ChatComposer } from "@/components/chat/ChatComposer";
import type { VisualAsset } from "@/types/artifact";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { DraftContentModal } from "@/components/chat/DraftContentModal";
import { useI18n } from "@/lib/i18n/useI18n";
// inferChatIntent removed, must be done on server
import { sendChatMessage, pollActiveTasks } from "@/app/actions/chat-actions";
import type { ChatMessage, ChatThread } from "@/types/chat";
import type { AuditLog } from "@/types/audit";
import { Loader2, CheckCircle2, Clock, Activity, History, PenLine } from "lucide-react";
import { UploadBannerButton } from "@/components/shared/UploadBannerButton";

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
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      
      inFlight = true;
      try {
        const [messagesRes, logsRes, latestTasks] = await Promise.all([
          fetch(`/api/chat-messages?thread_id=${thread.id}`, { cache: 'no-store' }).then(r => r.json()),
          fetch(`/api/audit-logs?entity_id=${thread.id}`, { cache: 'no-store' }).then(r => r.json()),
          pollActiveTasks()
        ]);
        if (mounted) {
          if (messagesRes.chat_messages) setMessages(messagesRes.chat_messages);
          if (logsRes.audit_logs) {
            setAuditLogs(logsRes.audit_logs);
          }
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
    return latest?.body ?? (tChat("chat.summary.latestFallback") ?? "Latest message will appear here.");
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
      intent_type: "unknown", // Client does not guess intent
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const result = await sendChatMessage(thread.id, trimmed, visual_assets);
      // If result.error exists, it is a fatal server error
      if (result?.error) {
        throw new Error(result.error);
      }
      // If success is false but there's no error string, it is a controlled rejection (e.g., missing scope).
      // We continue to fetch the messages so the system's clarification message is displayed.
      
      const [messagesRes, logsRes, latestTasks] = await Promise.all([
        fetch(`/api/chat-messages?thread_id=${thread.id}`, { cache: 'no-store' }).then(r => r.json()),
        fetch(`/api/audit-logs?entity_id=${thread.id}`, { cache: 'no-store' }).then(r => r.json()),
        pollActiveTasks()
      ]);
      if (messagesRes.chat_messages) setMessages(messagesRes.chat_messages);
      if (logsRes.audit_logs) {
        setAuditLogs(logsRes.audit_logs);
      }
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
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      const result = await sendChatMessage(thread.id, commandStr);
      if (result?.error) {
        throw new Error(result.error);
      }
      
      const [messagesRes, logsRes, latestTasks] = await Promise.all([
        fetch(`/api/chat-messages?thread_id=${thread.id}`, { cache: 'no-store' }).then(r => r.json()),
        fetch(`/api/audit-logs?entity_id=${thread.id}`, { cache: 'no-store' }).then(r => r.json()),
        pollActiveTasks()
      ]);
      if (messagesRes.chat_messages) setMessages(messagesRes.chat_messages);
      if (logsRes.audit_logs) {
        setAuditLogs(logsRes.audit_logs);
      }
      setActiveTasks(latestTasks);
    } catch (err) {
      console.error("Failed to send message", err);
      setSendError(err instanceof Error ? err.message : "Failed to send message");
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
    } finally {
      setIsSending(false);
    }
  }

  const handleCommand = useCallback(async (cmd: string) => {
    setIsSending(true);
    // Optimistic UI update
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      organization_id: thread.organization_id,
      thread_id: thread.id,
      sender: 'human',
      body: cmd,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as any]);
    
    try {
      const result = await sendChatMessage(thread.id, cmd);
      if (result?.error) throw new Error(result.error);
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  }, [thread.id, thread.organization_id]);

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]" style={{ height: 'calc(100vh - 120px)' }}>
      <div className="space-y-4 flex flex-col h-full min-h-0 min-w-0">
        {activeTasks.length > 0 && (
          <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-500/30 bg-gradient-to-br from-white to-indigo-50/50 dark:from-indigo-950/20 dark:to-indigo-950/20 p-4 shadow-[0_8px_30px_-5px_rgba(99,102,241,0.15)] dark:shadow-lg dark:shadow-indigo-900/10 shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
              <div className="text-xs uppercase tracking-[0.24em] font-semibold text-indigo-300">Active Tasks in Progress</div>
            </div>
            <div className="space-y-2">
              {activeTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-xl bg-white dark:bg-slate-900/50 p-3 border border-slate-200 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    {task.state === 'NOT_STARTED' || task.state === 'QUEUED' ? (
                      <Clock className="h-4 w-4 text-slate-400" />
                    ) : task.state === 'PARTIAL' ? (
                      <Loader2 className="h-4 w-4 text-emerald-400 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    )}
                    <div>
                      <div className="text-sm font-medium text-slate-200">{task.title}</div>
                      <div className="text-xs text-slate-400 dark:text-slate-500 font-mono mt-1">{task.intent_type}   {task.state}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-4 shrink-0 shadow-sm">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{tShared("shared.thread.summary") ?? "Thread summary"}</div>
          <div className="mt-2 text-sm text-slate-200 line-clamp-3">{summary}</div>
        </div>

        {sendError && (
          <div className="rounded-2xl border border-rose-200/80 dark:border-rose-500/30 bg-gradient-to-br from-white to-rose-50/50 dark:from-rose-950/40 dark:to-rose-950/40 p-4 shadow-sm text-sm text-rose-700 dark:text-rose-200">
            {sendError}
          </div>
        )}
        
        <div className="flex-1 min-h-0 overflow-y-auto rounded-2xl p-2">
          <ChatMessageList 
            messages={messages} 
            isTyping={isSending} 
            onCommand={handleCommand} 
          />
          <div ref={messagesEndRef} />
        </div>

        <div className="shrink-0 pt-2">
          <ChatComposer 
            onSubmit={handleSubmit} 
            onRequestCreateTask={(currentDraft) => {
              setModalDraft(currentDraft);
              setIsContentModalOpen(true);
            }}
          />
        </div>
      </div>
      <div className="space-y-4 flex flex-col h-full min-h-0 min-w-0">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-5 shrink-0 shadow-sm">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{thread.title}</div>
          <p className="mt-2 text-sm leading-6 text-slate-400">{thread.purpose}</p>
          <div className="mt-4 text-xs uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">{tShared("shared.thread.status") ?? "Thread status"}</div>
          <div className="mt-2 text-sm text-slate-200">{thread.status}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/70 p-5 flex flex-col flex-1 min-h-0 shadow-sm">
          <div className="text-sm font-semibold text-slate-900 dark:text-white shrink-0">{tShared("shared.audit.trail") ?? "Audit trail"}</div>
          <div className="mt-3 space-y-3 overflow-y-auto pr-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-3 shrink-0">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">{log.action_type}</div>
                <div className="mt-2 text-sm text-slate-200">
                  {log.metadata ? (
                    <div className="space-y-1">
                      {log.metadata.reason && <div><span className="text-slate-400">Chi ti?t:</span> {log.metadata.reason}</div>}
                      {log.metadata.before && log.metadata.after && (
                        <div><span className="text-slate-400">Tr?ng thi:</span> <span className="font-mono text-xs">{log.metadata.before}</span> &rarr; <span className="font-mono text-xs">{log.metadata.after}</span></div>
                      )}
                      {(!log.metadata.reason && !log.metadata.before) && (
                        <div className="font-mono text-[10px] break-all">{JSON.stringify(log.metadata)}</div>
                      )}
                    </div>
                  ) : "-"}
                </div>
              </div>
            ))}
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
