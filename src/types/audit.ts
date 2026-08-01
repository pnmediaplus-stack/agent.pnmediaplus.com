export type AuditLog = {
  id: string;
  entityType: "task" | "artifact" | "approval" | "workflow" | "chat" | "chat_thread" | "gate";
  entityId: string;
  action: string;
  actor: string;
  details: string;
  createdAt: string;
};
