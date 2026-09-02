"use client";

import { CommandInput } from "./CommandInput";

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  timestamp: string;
}

const mockHistory: Message[] = [
  {
    id: "1",
    role: "user",
    content: "Draft a new campaign for our upcoming Q4 SaaS webinar.",
    timestamp: "09:00 AM",
  },
  {
    id: "2",
    role: "agent",
    content: "I've drafted a campaign proposal and an initial email sequence. Please review them in the workspace on the right.",
    timestamp: "09:01 AM",
  },
];

export function AgentChatColumn() {
  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 relative z-10 w-[400px] flex-shrink-0">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 sticky top-0">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Marketing Agent</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Ready to assist with campaigns</p>
      </div>

      {/* Chat History */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {mockHistory.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
            <span className="text-[10px] text-slate-400 mb-1 px-1">{msg.timestamp}</span>
            <div 
              className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm ${
                msg.role === "user" 
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100" 
                  : "bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 border border-blue-100 dark:border-blue-900/30"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      {/* Command Input Area */}
      <CommandInput />
    </div>
  );
}
