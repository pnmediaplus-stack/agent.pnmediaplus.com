import type { TaskStatus, ChatIntentType } from "@/types/state";

export type Task = {
  id: string;
  title: string;
  departmentId: string;
  agentId?: string;
  status: TaskStatus;
  intentType: ChatIntentType;
  createdAt: string;
  updatedAt: string;
  owner: string;
  priority: "Low" | "Medium" | "High";
};
