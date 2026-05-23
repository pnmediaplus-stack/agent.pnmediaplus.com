"use client";

import { useEffect, useMemo, useState } from "react";
import type { Task } from "@/types/task";
import type { LifecycleState } from "@/types/state";
import { TaskStatusBadge } from "@/components/tasks/TaskStatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { useI18n } from "@/lib/i18n/useI18n";
import { departments as departmentRecords } from "@/lib/mock-data";

type TaskAction = {
  key: string;
  label: string;
  requestedTransition: LifecycleState;
  tone: "primary" | "danger" | "neutral";
};

type NoticeKind = "success" | "info" | "error";

type Notice = {
  kind: NoticeKind;
  title: string;
  detail?: string;
};

function getActionPlan(status: Task["status"], t: ReturnType<typeof useI18n>["t"]): TaskAction[] {
  switch (status) {
    case "DRAFT":
    case "PARTIAL":
      return [
        {
          key: "submit-for-review",
          label: t("tasks.actions.submitForReview") ?? "Submit for review",
          requestedTransition: "REVIEW",
          tone: "primary"
        }
      ];
    case "HOLD":
      return [
        {
          key: "submit-for-review",
          label: t("tasks.actions.submitForReview") ?? "Submit for review",
          requestedTransition: "READY_FOR_RECHECK",
          tone: "primary"
        },
        {
          key: "reject",
          label: t("tasks.actions.reject") ?? "Reject",
          requestedTransition: "BLOCKED",
          tone: "danger"
        }
      ];
    case "REVIEW":
      return [
        {
          key: "approve",
          label: t("tasks.actions.approve") ?? "Approve",
          requestedTransition: "PASS",
          tone: "primary"
        },
        {
          key: "reject",
          label: t("tasks.actions.reject") ?? "Reject",
          requestedTransition: "BLOCKED",
          tone: "danger"
        }
      ];
    case "PASS":
      return [
        {
          key: "approve",
          label: t("tasks.actions.approve") ?? "Approve",
          requestedTransition: "APPROVED",
          tone: "primary"
        }
      ];
    case "READY_FOR_RECHECK":
      return [
        {
          key: "submit-for-review",
          label: t("tasks.actions.submitForReview") ?? "Submit for review",
          requestedTransition: "REVIEW",
          tone: "primary"
        }
      ];
    default:
      return [];
  }
}

function noticeClasses(kind: NoticeKind) {
  if (kind === "error") return "border-rose-500/30 bg-rose-500/10 text-rose-100";
  if (kind === "info") return "border-cyan-500/30 bg-cyan-500/10 text-cyan-100";
  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";
}

function actionButtonClasses(tone: TaskAction["tone"], disabled: boolean) {
  const base =
    "inline-flex items-center rounded-lg border px-3 py-2 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-0";
  const variant =
    tone === "danger"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20 focus:ring-rose-400"
      : tone === "primary"
        ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20 focus:ring-cyan-400"
        : "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 focus:ring-slate-400";

  return [
    base,
    variant,
    disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
  ].join(" ");
}

function getTaskStatusLabel(status: Task["status"], t: ReturnType<typeof useI18n>["t"]) {
  switch (status) {
    case "NOT_STARTED":
      return t("tasks.status.notStarted") ?? "Not started";
    case "DRAFT":
      return t("tasks.status.draft") ?? "Draft";
    case "PARTIAL":
      return t("tasks.status.partial") ?? "Partially complete";
    case "REVIEW":
      return t("tasks.status.review") ?? "Under review";
    case "HOLD":
      return t("tasks.status.hold") ?? "On hold";
    case "READY_FOR_RECHECK":
      return t("tasks.status.readyForRecheck") ?? "Ready for recheck";
    case "PASS":
      return t("tasks.status.pass") ?? "Passed";
    case "BLOCKED":
      return t("tasks.status.blocked") ?? "Blocked";
    case "APPROVED":
      return t("tasks.status.approved") ?? "Approved";
    case "DEPRECATED":
      return t("tasks.status.deprecated") ?? "Deprecated";
    case "OPEN":
      return t("tasks.status.open") ?? "Open";
    case "IN_PROGRESS":
      return t("tasks.status.inProgress") ?? "In progress";
    case "DONE":
      return t("tasks.status.done") ?? "Done";
    default:
      return status;
  }
}

function getTaskIntentLabel(intentType: Task["intentType"], t: ReturnType<typeof useI18n>["t"]) {
  switch (intentType) {
    case "create_content":
      return t("tasks.intent.createContent") ?? "Create content";
    case "review_artifact":
      return t("tasks.intent.reviewArtifact") ?? "Review artifact";
    case "check_governance":
      return t("tasks.intent.checkGovernance") ?? "Check governance";
    case "request_status":
      return t("tasks.intent.requestStatus") ?? "Request status";
    case "approve_or_reject":
      return t("tasks.intent.approveOrReject") ?? "Approve or reject";
    case "unknown":
    default:
      return t("tasks.intent.unknown") ?? "Unknown";
  }
}

function getTaskPriorityLabel(priority: Task["priority"], t: ReturnType<typeof useI18n>["t"]) {
  switch (priority) {
    case "Low":
      return t("tasks.priority.low") ?? "Low";
    case "Medium":
      return t("tasks.priority.medium") ?? "Medium";
    case "High":
      return t("tasks.priority.high") ?? "High";
    default:
      return priority;
  }
}

function getDepartmentDisplay(departmentId: Task["departmentId"]) {
  const department = departmentRecords.find((item) => item.id === departmentId);
  return {
    name: department?.name ?? departmentId,
    id: department?.id ?? departmentId
  };
}

export function TaskTable({ tasks }: { tasks: Task[] }) {
  const { t } = useI18n("tasks");
  const [rows, setRows] = useState(tasks);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  useEffect(() => {
    setRows(tasks);
  }, [tasks]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 5000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const emptyCopy = useMemo(
    () => ({
    title: t("tasks.empty.title") ?? "No tasks yet",
      description:
        t("tasks.empty.description") ?? 
        "The task inbox is empty. New commands from chat will appear here in mock-safe form."
    }),
    [t]
  );

  async function handleAction(task: Task, action: TaskAction) {
    const requestKey = `${task.id}:${action.key}`;
    setPendingKey(requestKey);
    setNotice(null);

    try {
      const response = await fetch("/api/n8n/state-update-request", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          payload: {
            entity_type: "TASK",
            entity_id: task.id,
            current_state: task.status,
            requested_transition: action.requestedTransition,
            actor_type: "HUMAN",
            reason: `${action.label} via task inbox`,
            source: "task-inbox-ui"
          }
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const status = response.status;
        const title =
          status === 401
            ? t("tasks.feedback.unauthorized") ?? "Control plane secret is missing or invalid."
            : status === 403
              ? t("tasks.feedback.forbiddenAuthority") ?? "Human authority is required."
              : status === 400
                ? t("tasks.feedback.invalidState") ?? "Invalid state transition."
                : status === 409
                  ? t("tasks.feedback.forbiddenTransition") ?? "Transition blocked by state guard."
                  : status === 502
                    ? t("tasks.feedback.downstreamFailed") ?? "n8n is currently unavailable."
                    : (typeof data?.message === "string" && data.message) || "Task action failed.";

        const detail =
          typeof data?.message === "string" && data.message !== title ? data.message : undefined;

        setNotice({
          kind: "error",
          title,
          detail
        });
        return;
      }

      const nextStatus = action.requestedTransition;
      setRows((currentRows) =>
        currentRows.map((row) =>
          row.id === task.id
            ? {
                ...row,
                status: nextStatus as Task["status"],
                updatedAt: new Date().toISOString()
              }
            : row
        )
      );

      setNotice({
        kind: data?.mocked ? "info" : "success",
        title:
          (data?.mocked
            ? t("tasks.feedback.mocked")
            : t("tasks.feedback.success")) ?? "State update request sent.",
        detail: typeof data?.message === "string" ? data.message : undefined
      });
    } catch (error) {
      setNotice({
        kind: "error",
        title: t("tasks.feedback.downstreamFailed") ?? "n8n is currently unavailable.",
        detail: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setPendingKey(null);
    }
  }

  if (!rows.length) {
    return <EmptyState title={emptyCopy.title} description={emptyCopy.description} />;
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70">
      {notice ? (
        <div className="pointer-events-none absolute right-4 top-4 z-20 w-[min(100%-2rem,28rem)]">
          <div
            role="status"
            aria-live="polite"
            className={`rounded-2xl border px-4 py-3 shadow-lg backdrop-blur ${noticeClasses(notice.kind)}`}
          >
            <div className="text-sm font-semibold">{notice.title}</div>
            {notice.detail ? <div className="mt-1 text-xs opacity-90">{notice.detail}</div> : null}
          </div>
        </div>
      ) : null}
      <div className="border-b border-slate-800 px-5 py-4">
        <div className="text-sm font-semibold text-white">{t("tasks.table.title") ?? "Task inbox"}</div>
        <div className="mt-1 text-xs text-slate-400">
          {t("tasks.table.description") ?? "Sorted for scanability with safe state badges and ownership context."}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1020px] divide-y divide-slate-800 text-left text-sm">
          <thead className="bg-slate-900/70 text-xs uppercase tracking-[0.22em] text-slate-400">
            <tr>
              <th className="px-5 py-3">{t("tasks.table.task") ?? "Task"}</th>
              <th className="px-5 py-3">{t("tasks.table.owner") ?? "Owner"}</th>
              <th className="px-5 py-3">{t("tasks.table.department") ?? "Department"}</th>
              <th className="px-5 py-3">{t("tasks.table.intent") ?? "Intent"}</th>
              <th className="px-5 py-3">{t("tasks.table.status") ?? "Status"}</th>
              <th className="px-5 py-3">{t("tasks.table.priority") ?? "Priority"}</th>
              <th className="px-5 py-3">{t("tasks.table.actions") ?? "Actions"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((task) => {
              const actions = getActionPlan(task.status, t);
              const department = getDepartmentDisplay(task.departmentId);

              return (
                <tr key={task.id} className="text-slate-300">
                  <td className="px-5 py-4">
                    <div className="font-medium text-white">{task.title}</div>
                    <div className="text-xs text-slate-500">{task.id}</div>
                  </td>
                  <td className="px-5 py-4">{task.owner}</td>
                  <td className="px-5 py-4">
                    <div className="font-medium text-white">{department.name}</div>
                    <div className="text-xs text-slate-500">{department.id}</div>
                  </td>
                  <td className="px-5 py-4">{getTaskIntentLabel(task.intentType, t)}</td>
                  <td className="px-5 py-4">
                    <TaskStatusBadge status={task.status} displayLabel={getTaskStatusLabel(task.status, t)} />
                  </td>
                  <td className="px-5 py-4">{getTaskPriorityLabel(task.priority, t)}</td>
                  <td className="px-5 py-4">
                    {actions.length ? (
                      <div className="flex flex-wrap gap-2">
                        {actions.map((action) => {
                          const isCurrentAction = pendingKey === `${task.id}:${action.key}`;
                          return (
                            <button
                              key={action.key}
                              type="button"
                              disabled={Boolean(pendingKey) || isCurrentAction}
                              onClick={() => handleAction(task, action)}
                              className={actionButtonClasses(action.tone, Boolean(pendingKey) || isCurrentAction)}
                            >
                            {isCurrentAction ? (t("tasks.actions.sending") ?? "Sending...") : action.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">{t("tasks.actions.none") ?? "No actions available"}</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
