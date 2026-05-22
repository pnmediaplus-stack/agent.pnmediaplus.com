import type { AuditLog } from "@/types/audit";

export function createAuditLog(
  entityType: AuditLog["entityType"],
  entityId: string,
  action: string,
  actor: string,
  details: string
): AuditLog {
  return {
    id: `audit-${entityType}-${entityId}-${Date.now()}`,
    entityType,
    entityId,
    action,
    actor,
    details,
    createdAt: new Date().toISOString()
  };
}
