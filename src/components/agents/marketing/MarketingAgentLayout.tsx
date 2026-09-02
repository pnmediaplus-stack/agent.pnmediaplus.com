"use client";

import { ReactNode } from "react";
import { AgentChatColumn } from "./AgentChatColumn";

export function MarketingAgentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full w-full overflow-hidden">
      <AgentChatColumn />
      {children}
    </div>
  );
}
