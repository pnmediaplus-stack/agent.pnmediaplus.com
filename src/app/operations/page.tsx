"use client";

import { PageFrame } from "@/components/shared/PageFrame";
import { OperationsExecutionSurface } from "@/components/operations/OperationsExecutionSurface";
import { useI18n } from "@/lib/i18n/useI18n";

export default function OperationsPage() {
  const { t } = useI18n("operations");

  return (
    <PageFrame
      title={t("operations.page.title") ?? "Operations execution"}
      purpose={t("operations.page.purpose") ?? "Read-only operations surface for workflow execution, routing, monitoring, escalation, and customer output."}
      statusLabel={t("operations.page.statusLabel") ?? "Operations surface"}
      statusValue="RUNNING"
      statusDisplayValue={t("operations.page.statusValue") ?? "Read-only"}
      allowedActions={[
        t("operations.page.allowed.inspectExecution") ?? "Inspect execution",
        t("operations.page.allowed.reviewRouting") ?? "Review routing",
        t("operations.page.allowed.previewEscalations") ?? "Preview escalations"
      ]}
      forbiddenActions={[
        t("operations.page.forbidden.mutateRuntime") ?? "Mutate runtime",
        t("operations.page.forbidden.startPublish") ?? "Start publish",
        t("operations.page.forbidden.selfApprove") ?? "Self-approve"
      ]}
    >
      <OperationsExecutionSurface />
    </PageFrame>
  );
}
