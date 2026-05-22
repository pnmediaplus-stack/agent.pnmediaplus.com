"use client";

import { useMemo, useState } from "react";
import { ChatComposer } from "@/components/chat/ChatComposer";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { createAuditLog } from "@/lib/audit";
import { useI18n } from "@/lib/i18n/useI18n";
import { inferChatIntent, requiresHumanApproval } from "@/lib/validators";
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
  const { t: tChat } = useI18n("chat");
  const { t: tShared } = useI18n("shared");

  const summary = useMemo(() => {
    const latest = messages[messages.length - 1];
    return latest?.body ?? (tChat("chat.summary.latestFallback") ?? "No messages yet");
  }, [messages, tChat]);

  function handleSubmit() {
    const trimmed = draft.trim();
    if (!trimmed) return;

    const intentType = inferChatIntent(trimmed);
    const baseMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      threadId: thread.id,
      sender: "human",
      body: trimmed,
      intentType,
      createdAt: new Date().toISOString()
    };

    const nextMessages = [...messages, baseMessage];
    const nextAudit = [
      ...auditLogs,
      createAuditLog("chat", thread.id, "message_received", "Human", `intent=${intentType}`)
    ];

    if (requiresHumanApproval(trimmed)) {
      nextMessages.push({
        id: `msg-${Date.now()}-system`,
        threadId: thread.id,
        sender: "system",
        body: tChat("chat.system.publishLaunch") ?? "This command implies publish or launch. Please use the approval console and confirm human authority before any release action.",
        intentType: "check_governance",
        createdAt: new Date().toISOString()
      });
    } else {
      nextMessages.push({
        id: `msg-${Date.now()}-agent`,
        threadId: thread.id,
        sender: "agent",
        body: tChat("chat.agent.mockTaskCreated") ?? "Mock task created and routed to the correct department. In Phase 1 this stays local and reviewable.",
        intentType,
        createdAt: new Date().toISOString()
      });
    }

    setMessages(nextMessages);
    setAuditLogs(nextAudit);
    setDraft("");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-4">
        <ChatComposer value={draft} onChange={setDraft} onSubmit={handleSubmit} />
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="text-xs uppercase tracking-[0.24em] text-slate-400">{tShared("shared.thread.summary") ?? "Thread summary"}</div>
          <div className="mt-2 text-sm text-slate-200">{summary}</div>
        </div>
        <ChatMessageList messages={messages} />
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
