"use client";

import { ReactNode } from "react";
import { AgentChatColumn } from "./AgentChatColumn";

export function MarketingAgentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[680px] max-h-[calc(100vh-11rem)] min-h-[500px] w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-md">
      <AgentChatColumn />
      {children}
    </div>
  );
}
