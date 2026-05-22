import type { LifecycleState } from "@/types/state";

export type Agent = {
  id: string;
  name: string;
  departmentId: string;
  role: string;
  status: "ONLINE" | "IDLE" | "BLOCKED";
  state: LifecycleState;
  focus: string;
};
