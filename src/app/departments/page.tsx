"use client";

import { PageFrame } from "@/components/shared/PageFrame";
import { DepartmentCard } from "@/components/departments/DepartmentCard";
import { useI18n } from "@/lib/i18n/useI18n";
import { departments } from "@/lib/mock-data";

export default function DepartmentsPage() {
  const { t } = useI18n("departments");
  const statusDisplayValue = t("departments.state.review") ?? "Reviewing";

  return (
    <PageFrame
      title={t("departments.page.title") ?? "Departments"}
      purpose={t("departments.page.purpose") ?? "Internal department directory with ownership, purpose, and active task counts."}
      statusLabel={t("departments.page.statusLabel") ?? "Department registry"}
      statusValue="PARTIAL"
      statusDisplayValue={statusDisplayValue}
      allowedActions={[
        t("departments.page.allowed.inspectOwnership") ?? "Inspect department ownership",
        t("departments.page.allowed.viewOpenTasks") ?? "View open tasks",
        t("departments.page.allowed.routeIncomingWork") ?? "Route incoming work"
      ]}
      forbiddenActions={[
        t("departments.page.forbidden.createTenant") ?? "Create tenant",
        t("departments.page.forbidden.exposePublicAccount") ?? "Expose public account",
        t("departments.page.forbidden.changeAuthority") ?? "Change authority"
      ]}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {departments.map((department) => (
          <DepartmentCard key={department.id} department={department} />
        ))}
      </div>
    </PageFrame>
  );
}
