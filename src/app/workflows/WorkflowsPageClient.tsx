"use client";

import { PageFrame } from "@/components/shared/PageFrame";
import { WorkflowRunTable } from "@/components/workflows/WorkflowRunTable";
import { useI18n } from "@/lib/i18n/useI18n";
import type { WorkflowRun } from "@/types/workflow";

export function WorkflowsPageClient({ runs }: { runs: WorkflowRun[] }) {
  const { t } = useI18n("workflows");

  return (
    <PageFrame
      title={t("workflows.page.title") ?? "Workflows"}
      purpose={t("workflows.page.purpose") ?? "Workflow board for state transitions, run status, and safe handoff checkpoints."}
      statusLabel={t("workflows.page.statusLabel") ?? "Workflow board"}
      statusValue="WAITING_ON_HUMAN"
      allowedActions={[
        t("workflows.page.allowed.inspectRunStatus") ?? "Inspect run status",
        t("workflows.page.allowed.reviewCheckpoints") ?? "Review checkpoints",
        t("workflows.page.allowed.holdForHumanReview") ?? "Hold for human review"
      ]}
      forbiddenActions={[
        t("workflows.page.forbidden.automaticLaunch") ?? "Automatic launch",
        t("workflows.page.forbidden.productionDeploy") ?? "Production deploy",
        t("workflows.page.forbidden.stateBypass") ?? "State bypass"
      ]}
    >
      <WorkflowRunTable runs={runs} />
    </PageFrame>
  );
}
