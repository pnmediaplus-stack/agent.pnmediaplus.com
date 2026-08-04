"use client";

import { useI18n } from "@/lib/i18n/useI18n";
import type { ChatMessage } from "@/types/chat";
import { User, Bot, LayoutTemplate, Activity } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function ChatMessageList({ messages, isTyping }: { messages: ChatMessage[], isTyping?: boolean }) {
  const { t } = useI18n("chat");
  return (
    <div className="space-y-3">
      {messages.map((message) => {
        const isHuman = message.sender === "human";
        const isAgent = message.sender === "agent";

        return (
          <div
            key={message.id}
            className={`flex w-full ${isHuman ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`relative max-w-[85%] overflow-hidden rounded-2xl border p-4 shadow-xl backdrop-blur-xl transition-all hover:shadow-2xl ${
                isHuman
                  ? "border-cyan-500/30 bg-cyan-950/40 shadow-cyan-900/20 rounded-tr-sm"
                  : isAgent
                    ? "border-emerald-500/30 bg-emerald-950/40 shadow-emerald-900/20 rounded-tl-sm"
                    : "border-slate-800/60 bg-slate-900/50 shadow-black/20 rounded-tl-sm"
              }`}
            >
              <div className="mb-3 flex items-center justify-between gap-4 border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                    isHuman ? "border-cyan-500/50 bg-cyan-500/20" : isAgent ? "border-emerald-500/50 bg-emerald-500/20" : "border-slate-600 bg-slate-800"
                  }`}>
                    {isHuman ? (
                      <User className="h-3.5 w-3.5 text-cyan-300" />
                    ) : isAgent ? (
                      <Bot className="h-3.5 w-3.5 text-emerald-300" />
                    ) : (
                      <LayoutTemplate className="h-3.5 w-3.5 text-slate-300" />
                    )}
                  </div>
                  <span className={`text-[11px] font-semibold uppercase tracking-widest ${
                    isHuman ? "text-cyan-300" : isAgent ? "text-emerald-300" : "text-slate-400"
                  }`}>
                    {isHuman
                      ? (t("chat.message.sender.human") ?? "Human")
                      : isAgent
                        ? (t("chat.message.sender.agent") ?? "Agent")
                        : (t("chat.message.sender.system") ?? "System")}
                  </span>
                </div>
                <div className="font-mono text-[10px] text-slate-500">{new Date(message.created_at).toLocaleTimeString()}</div>
              </div>
              
              <div className="text-sm leading-relaxed text-slate-200 prose prose-invert prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.body}
                </ReactMarkdown>
              </div>
              
              {message.intent_type ? (
                <div className="mt-4 flex items-center gap-1.5 rounded bg-black/20 px-2.5 py-1 w-fit border border-white/5">
                  <Activity className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="font-mono text-[10px] text-slate-400">
                    {t("chat.message.intentPrefix") ?? "INTENT"}: <span className="text-indigo-300">{message.intent_type}</span>
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
      
      {isTyping && (
        <div className="flex w-full justify-start">
          <div className="relative max-w-[85%] overflow-hidden rounded-2xl border p-4 shadow-xl backdrop-blur-xl border-emerald-500/30 bg-emerald-950/40 shadow-emerald-900/20 rounded-tl-sm animate-pulse">
            <div className="mb-3 flex items-center justify-between gap-4 border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-500/20">
                  <Bot className="h-3.5 w-3.5 text-emerald-300" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300">
                  {t("chat.message.sender.agent") ?? "Agent"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-emerald-400/50 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="h-2 w-2 rounded-full bg-emerald-400/50 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="h-2 w-2 rounded-full bg-emerald-400/50 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
