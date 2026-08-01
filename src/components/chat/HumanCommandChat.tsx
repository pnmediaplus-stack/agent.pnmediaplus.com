"use client";

import { useMemo, useState, useEffect } from "react";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { useI18n } from "@/lib/i18n/useI18n";
import { inferChatIntent } from "@/lib/validators";
import { sendChatMessage, pollChatMessages, pollAuditLogs } from "@/app/actions/chat-actions";
import type { ChatMessage, ChatThread } from "@/types/chat";
import type { AuditLog } from "@/types/audit";

type HumanCommandChatProps = {
  thread: ChatThread;
  initialMessages: ChatMessage[];
  initialAuditLogs: AuditLog[];
};

export function HumanCommandChat({ thread, initialMessages, initialAuditLogs }: HumanCommandChatProps) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [auditLogs, setAuditLogs] = useState(initialAuditLogs);
  const [isSending, setIsSending] = useState(false);
  const { t: tChat } = useI18n("chat");
  const { t: tShared } = useI18n("shared");

  useEffect(() => {
    let mounted = true;
    let inFlight = false;
    const interval = setInterval(async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const [latestMessages, latestLogs] = await Promise.all([
          pollChatMessages(thread.id),
          pollAuditLogs(thread.id)
        ]);
        if (mounted) {
          setMessages(latestMessages);
          setAuditLogs(latestLogs);
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
      const [latestMessages, latestLogs] = await Promise.all([
        pollChatMessages(thread.id),
        pollAuditLogs(thread.id)
      ]);
      setMessages(latestMessages);
      setAuditLogs(latestLogs);
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
        <ChatComposer value={draft} onChange={setDraft} onSubmit={handleSubmit} />
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{tShared("shared.thread.summary") ?? "Thread summary"}</div>
          <div className="mt-2 text-sm text-slate-200 line-clamp-3">{summary}</div>
        </div>
        <ChatMessageList messages={messages} isTyping={isSending} />
      </div>
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <div className="text-sm font-semibold text-white">{thread.title}</div>
          <p className="mt-2 text-sm leading-6 text-slate-400">{thread.purpose}</p>
          <div className="mt-4 text-xs uppercase tracking-[0.24em] text-slate-500">{tShared("shared.thread.status") ?? "Thread status"}</div>
          <div className="mt-2 text-sm text-slate-200">{thread.status}</div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <div className="text-sm font-semibold text-white">{tShared("shared.audit.trail") ?? "Audit trail"}</div>
          <div className="mt-3 space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
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
