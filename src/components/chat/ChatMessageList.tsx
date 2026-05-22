"use client";

import { useI18n } from "@/lib/i18n/useI18n";
import type { ChatMessage } from "@/types/chat";

export function ChatMessageList({ messages }: { messages: ChatMessage[] }) {
  const { t } = useI18n("chat");
  return (
    <div className="space-y-3">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`rounded-2xl border px-4 py-3 ${
            message.sender === "human"
              ? "border-cyan-500/20 bg-cyan-500/5"
              : message.sender === "agent"
                ? "border-emerald-500/20 bg-emerald-500/5"
                : "border-slate-800 bg-slate-950/70"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">
              {message.sender === "human"
                ? (t("chat.message.sender.human") ?? "Human")
                : message.sender === "agent"
                  ? (t("chat.message.sender.agent") ?? "Agent")
                  : (t("chat.message.sender.system") ?? "System")}
            </div>
            <div className="text-xs text-slate-500">{message.createdAt}</div>
          </div>
          <div className="mt-2 text-sm leading-6 text-slate-200">{message.body}</div>
          {message.intentType ? (
            <div className="mt-2 text-xs text-slate-400">{t("chat.message.intentPrefix") ?? "intent"}: {message.intentType}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
