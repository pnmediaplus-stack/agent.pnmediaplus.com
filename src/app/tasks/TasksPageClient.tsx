"use client";

import { PageFrame } from "@/components/shared/PageFrame";
import { TaskTable } from "@/components/tasks/TaskTable";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Task } from "@/types/task";
import type { Department } from "@/types/department";

export function TasksPageClient({ tasks, departments }: { tasks: Task[], departments: Department[] }) {
  const { t } = useI18n("tasks");
  const statusDisplayValue = t("tasks.status.draft") ?? "Draft";

  return (
    <PageFrame
      title={t("tasks.page.title") ?? "Tasks"}
      purpose={t("tasks.page.purpose") ?? "Task inbox with safe state badges, ownership, intent types, and current workflow phase."}
      statusLabel={t("tasks.page.statusLabel") ?? "Task inbox"}
      statusValue="DRAFT"
      statusDisplayValue={statusDisplayValue}
      allowedActions={[
        t("tasks.page.allowed.viewStatus") ?? "View task status",
        t("tasks.page.allowed.requestApproval") ?? "Request approval",
        t("tasks.page.allowed.markReadyReview") ?? "Mark ready for review"
      ]}
      forbiddenActions={[
        t("tasks.page.forbidden.launchNow") ?? "Launch",
        t("tasks.page.forbidden.publishNow") ?? "Publish",
        t("tasks.page.forbidden.autoDeploy") ?? "Auto deploy"
      ]}
    >
      <TaskTable tasks={tasks} departments={departments} />
    </PageFrame>
  );
}
