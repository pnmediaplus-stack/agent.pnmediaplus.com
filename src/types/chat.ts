import type { ChatIntentType } from "@/types/state";

export type ChatMessage = {
  id: string;
  organization_id: string;
  thread_id: string;
  sender: "human" | "system" | "agent" | "n8n";
  body: string;
  intent_type?: ChatIntentType;
  metadata?: any;
  created_at: string;
  updated_at: string;
};

export type ChatThread = {
  id: string;
  organization_id: string;
  title: string;
  purpose: string | null;
  status: "ACTIVE" | "WAITING_ON_HUMAN" | "CLOSED";
  last_activity_at: string;
  metadata?: any;
  created_at: string;
  updated_at: string;
};
