"use client";

import { ReactNode } from "react";
import { AgentChatColumn } from "./AgentChatColumn";

export function MarketingAgentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-12rem)] lg:max-h-[750px] lg:min-h-[480px] w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-md">
      <AgentChatColumn />
      {children}
    </div>
  );
}
