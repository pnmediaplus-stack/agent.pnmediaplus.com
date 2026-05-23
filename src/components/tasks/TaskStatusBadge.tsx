import { StateBadge } from "@/components/shared/StateBadge";

export function TaskStatusBadge({ status, displayLabel }: { status: string; displayLabel?: string }) {
  return <StateBadge label={status} displayLabel={displayLabel} />;
}
