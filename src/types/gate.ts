import type { GateStatus } from "@/types/state";

export type Gate = {
  id: string;
  name: string;
  status: GateStatus;
  owner: string;
  rationale: string;
};
