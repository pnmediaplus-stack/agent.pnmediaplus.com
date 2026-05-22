import type { LifecycleState } from "@/types/state";

export type Department = {
  id: string;
  name: string;
  owner: string;
  purpose: string;
  state: LifecycleState;
  activeAgents: number;
  openTasks: number;
};
