"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { useI18n } from "@/lib/i18n/useI18n";
import { inferChatIntent } from "@/lib/validators";
import { sendChatMessage, pollChatMessages, pollAuditLogs, pollActiveTasks } from "@/app/actions/chat-actions";
import type { ChatMessage, ChatThread } from "@/types/chat";
import type { AuditLog } from "@/types/audit";
import { Loader2, CheckCircle2, Clock } from "lucide-react";

type HumanCommandChatProps = {
  thread: ChatThread;
  initialMessages: ChatMessage[];
  initialAuditLogs: AuditLog[];
};

export function HumanCommandChat({ thread, initialMessages, initialAuditLogs }: HumanCommandChatProps) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs);
  const [activeTasks, setActiveTasks] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const { t: tChat } = useI18n("chat");
  const { t: tShared } = useI18n("shared");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, isSending]);
  useEffect(() => {
    let mounted = true;
    let inFlight = false;
    const interval = setInterval(async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const [latestMessages, latestLogs, latestTasks] = await Promise.all([
          pollChatMessages(thread.id),
          pollAuditLogs(thread.id),
          pollActiveTasks()
        ]);
        if (mounted) {
          setMessages(latestMessages);
          setAuditLogs(latestLogs);
          setActiveTasks(latestTasks);
        }
      } catch (err) {
        console.error("Polling error:", err);
      } finally {
        inFlight = false;
      }
    }, 3000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [thread.id]);

  const summary = useMemo(() => {
    const latest = messages[messages.length - 1];
    return latest?.body ?? (tChat("chat.summary.latestFallback") ?? "Latest message will appear here.");
  }, [messages, tChat]);

  async function handleSubmit() {
    const trimmed = draft.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setDraft("");

    const intentType = inferChatIntent(trimmed);
    const optimisticMessage: ChatMessage = {
      id: `optimistic-${Date.now()}`,
      threadId: thread.id,
      sender: "human",
      body: trimmed,
      intentType,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      await sendChatMessage(thread.id, trimmed, intentType);
      
      // Force a poll immediately after send
      const [latestMessages, latestLogs, latestTasks] = await Promise.all([
        pollChatMessages(thread.id),
        pollAuditLogs(thread.id),
        pollActiveTasks()
      ]);
      setMessages(latestMessages);
      setAuditLogs(latestLogs);
      setActiveTasks(latestTasks);
    } catch (err) {
      console.error("Failed to send message", err);
      // Rollback optimistic update
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-4">
        {activeTasks.length > 0 && (
          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 p-4 shadow-lg shadow-indigo-900/10">
            <div className="flex items-center gap-2 mb-3">
              <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
              <div className="text-xs uppercase tracking-[0.24em] font-semibold text-indigo-300">Active Tasks in Progress</div>
            </div>
            <div className="space-y-2">
              {activeTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-xl bg-slate-900/50 p-3 border border-white/5">
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
                      <div className="text-xs text-slate-500 font-mono mt-1">{task.intent_type} • {task.state}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{tShared("shared.thread.summary") ?? "Thread summary"}</div>
          <div className="mt-2 text-sm text-slate-200 line-clamp-3">{summary}</div>
        </div>
        
        <div className="max-h-[85vh] overflow-y-auto rounded-2xl p-2 scroll-smooth">
          <ChatMessageList messages={messages} isTyping={isSending} />
          <div ref={messagesEndRef} />
        </div>

        <ChatComposer value={draft} onChange={setDraft} onSubmit={handleSubmit} />
      </div>
      <div className="space-y-4 flex flex-col h-full overflow-hidden">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shrink-0">
          <div className="text-sm font-semibold text-white">{thread.title}</div>
          <p className="mt-2 text-sm leading-6 text-slate-400">{thread.purpose}</p>
          <div className="mt-4 text-xs uppercase tracking-[0.24em] text-slate-500">{tShared("shared.thread.status") ?? "Thread status"}</div>
          <div className="mt-2 text-sm text-slate-200">{thread.status}</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 flex flex-col flex-1 min-h-0">
          <div className="text-sm font-semibold text-white shrink-0">{tShared("shared.audit.trail") ?? "Audit trail"}</div>
          <div className="mt-3 space-y-3 overflow-y-auto pr-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 shrink-0">
                <div className="text-xs uppercase tracking-[0.24em] text-slate-500">{log.action}</div>
                <div className="mt-2 text-sm text-slate-200">{log.details}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
