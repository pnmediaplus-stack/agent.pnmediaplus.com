import { StateBadge } from "@/components/shared/StateBadge";

export function TaskStatusBadge({ status }: { status: string }) {
  return <StateBadge label={status} />;
}
