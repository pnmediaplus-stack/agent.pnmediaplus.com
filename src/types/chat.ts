import type { ChatIntentType } from "@/types/state";

export type ChatMessage = {
  id: string;
  threadId: string;
  sender: "human" | "system" | "agent";
  body: string;
  intentType?: ChatIntentType;
  targetDepartmentId?: string;
  targetAgentId?: string;
  createdAt: string;
};

export type ChatThread = {
  id: string;
  title: string;
  purpose: string;
  lastActivityAt: string;
  status: "ACTIVE" | "WAITING_ON_HUMAN" | "CLOSED";
};
