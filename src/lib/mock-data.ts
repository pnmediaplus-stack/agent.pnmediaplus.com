import type { Department } from "@/types/department";
import type { Agent } from "@/types/agent";
import type { Task } from "@/types/task";
import type { Artifact } from "@/types/artifact";
import type { WorkflowRun } from "@/types/workflow";
import type { QAReview } from "@/types/qa";
import type { Gate } from "@/types/gate";
import type { Approval } from "@/types/approval";
import type { ChatMessage, ChatThread } from "@/types/chat";
import type { AuditLog } from "@/types/audit";

const now = new Date().toISOString();

export const departments = [
  {
    id: "gov-core",
    name: "Marketing/Governance Core",
    owner: "Human Founder",
    purpose: "Approval, governance, command intake, and state supervision.",
    state: "REVIEW",
    activeAgents: 4,
    openTasks: 3
  },
  {
    id: "media-exec",
    name: "PN MEDIA PLUS Media Execution Department",
    owner: "Media Lead",
    purpose: "Content operations, production coordination, and media pipeline monitoring.",
    state: "PARTIAL",
    activeAgents: 5,
    openTasks: 6
  }
] as any;

export const agents = [
  {
    id: "agent-ops-01",
    name: "Governance Intake",
    departmentId: "gov-core",
    role: "Command triage and safety checks",
    status: "ONLINE",
    state: "REVIEW",
    focus: "Human chat intake and approval routing"
  },
  {
    id: "agent-ops-02",
    name: "QA Sentinel",
    departmentId: "gov-core",
    role: "Review reviewer notes",
    status: "IDLE",
    state: "PASS",
    focus: "Artifact and gate validation"
  },
  {
    id: "agent-media-01",
    name: "Media Dispatcher",
    departmentId: "media-exec",
    role: "Route media tasks",
    status: "ONLINE",
    state: "PARTIAL",
    focus: "Campaign and asset task intake"
  },
  {
    id: "agent-media-02",
    name: "Pipeline Watcher",
    departmentId: "media-exec",
    role: "Monitor workflow runs",
    status: "BLOCKED",
    state: "HOLD",
    focus: "n8n run health and handoffs"
  }
] as any;

export const tasks = [
  {
    id: "task-001",
    title: "Prepare launch-safe campaign summary",
    departmentId: "gov-core",
    agentId: "agent-ops-01",
    status: "DRAFT",
    intentType: "create_content",
    createdAt: now,
    updatedAt: now,
    owner: "Human Founder",
    priority: "High"
  },
  {
    id: "task-002",
    title: "Audit media pipeline state",
    departmentId: "media-exec",
    agentId: "agent-media-02",
    status: "REVIEW",
    intentType: "request_status",
    createdAt: now,
    updatedAt: now,
    owner: "Media Lead",
    priority: "Medium"
  },
  {
    id: "task-003",
    title: "Review governance gate checklist",
    departmentId: "gov-core",
    status: "HOLD",
    intentType: "check_governance",
    createdAt: now,
    updatedAt: now,
    owner: "Human Founder",
    priority: "High"
  }
] as any;

export const artifacts = [
  {
    id: "art-001",
    title: "Phase 1 Scaffold Plan",
    type: "brief",
    departmentId: "gov-core",
    state: "APPROVED",
    updatedAt: now,
    version: "v1.0"
  },
  {
    id: "art-002",
    title: "Media Pipeline Board Draft",
    type: "workflow",
    departmentId: "media-exec",
    state: "REVIEW",
    updatedAt: now,
    version: "v0.8"
  },
  {
    id: "art-003",
    title: "Governance Prompt Patch",
    type: "prompt",
    departmentId: "gov-core",
    state: "PASS",
    updatedAt: now,
    version: "v1.1"
  }
] as any;

export const workflowRuns = [
  {
    id: "run-001",
    name: "Human task intake",
    workflowKey: "human_task_intake",
    status: "RUNNING",
    startedAt: now,
    duration: "42s",
    target: "n8n"
  },
  {
    id: "run-002",
    name: "State update request",
    workflowKey: "state_update_request",
    status: "WAITING_ON_HUMAN",
    startedAt: now,
    duration: "2m 11s",
    target: "approval-console"
  },
  {
    id: "run-003",
    name: "Audit append",
    workflowKey: "audit_log_append",
    status: "SUCCEEDED",
    startedAt: now,
    duration: "12s",
    target: "registry"
  }
] as any;

export const qaReviews = [
  {
    id: "qa-001",
    artifactId: "art-001",
    reviewer: "QA Sentinel",
    status: "PASS",
    notes: "Scope is aligned and launch-safe.",
    reviewedAt: now
  },
  {
    id: "qa-002",
    artifactId: "art-002",
    reviewer: "Governance Intake",
    status: "REVIEW",
    notes: "Needs media-owner confirmation before state promotion.",
    reviewedAt: now
  },
  {
    id: "qa-003",
    artifactId: "art-003",
    reviewer: "QA Sentinel",
    status: "BLOCKED",
    notes: "Prompt patch references launch semantics and must stay gated.",
    reviewedAt: now
  }
] as any;

export const gates = [
  {
    id: "gate-001",
    name: "Human Approval Gate",
    status: "REVIEW_REQUIRED",
    owner: "Human Founder",
    rationale: "No publish or launch action is allowed without explicit approval."
  },
  {
    id: "gate-002",
    name: "QA State Gate",
    status: "APPROVED",
    owner: "QA Sentinel",
    rationale: "State transitions are guarded by the local state machine."
  },
  {
    id: "gate-003",
    name: "Media Release Gate",
    status: "BLOCKED",
    owner: "Media Lead",
    rationale: "Media pipeline is internal only in Phase 1."
  }
] as any;

export const approvals = [
  {
    id: "approval-001",
    targetType: "task",
    targetId: "task-003",
    status: "REQUESTED",
    requestedBy: "Governance Intake",
    requestedAt: now
  },
  {
    id: "approval-002",
    targetType: "artifact",
    targetId: "art-001",
    status: "APPROVED",
    requestedBy: "QA Sentinel",
    requestedAt: now,
    decidedBy: "Human Founder"
  }
] as any;

export const chatThreads = [
  {
    id: "thread-001",
    title: "Human command intake",
    purpose: "Capture commands, route tasks, and request clarifications.",
    lastActivityAt: now,
    status: "ACTIVE"
  }
] as any;

export const chatMessages = [
  {
    id: "msg-001",
    threadId: "thread-001",
    sender: "system",
    body: "Phase 1 chat is live and compatibility views are active.",
    createdAt: now
  },
  {
    id: "msg-002",
    threadId: "thread-001",
    sender: "human",
    body: "Please prepare the governance summary and route it to the right department.",
    intentType: "create_content",
    targetDepartmentId: "gov-core",
    createdAt: now
  },
  {
    id: "msg-003",
    threadId: "thread-001",
    sender: "agent",
    body: "Task created and awaiting human review for promotion.",
    createdAt: now
  }
] as any;

export const auditLogs = [
  {
    id: "audit-001",
    entityType: "chat",
    entityId: "thread-001",
    action: "message_received",
    actor: "Human Founder",
    details: "Command intake created a review-ready task request.",
    createdAt: now
  },
  {
    id: "audit-002",
    entityType: "task",
    entityId: "task-003",
    action: "approval_requested",
    actor: "Governance Intake",
    details: "Task moved to approval request status.",
    createdAt: now
  },
  {
    id: "audit-003",
    entityType: "workflow",
    entityId: "run-002",
    action: "waiting_on_human",
    actor: "n8n",
    details: "State update request is parked at the human gate.",
    createdAt: now
  }
] as any;

export const mediaPipeline = [
  {
    id: "media-001",
    stage: "Intake",
    status: "READY",
    owner: "Media Dispatcher",
    note: "Awaiting task assignment"
  },
  {
    id: "media-002",
    stage: "Editing",
    status: "IN_PROGRESS",
    owner: "Producer",
    note: "Using approved assets only"
  },
  {
    id: "media-003",
    stage: "QA",
    status: "HOLD",
    owner: "QA Sentinel",
    note: "Needs human check before promotion"
  }
];
