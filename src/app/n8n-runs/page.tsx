"use client";

import { PageFrame } from "@/components/shared/PageFrame";
import { WorkflowRunTable } from "@/components/workflows/WorkflowRunTable";
import { useI18n } from "@/lib/i18n/useI18n";
import { workflowRuns } from "@/lib/mock-data";

export default function N8nRunsPage() {
  const { t } = useI18n("n8n");

  return (
    <PageFrame
      title={t("n8n.page.title") ?? "n8n Runs"}
      purpose={t("n8n.page.purpose") ?? "Monitor safe run status from n8n without exposing secrets or triggering launch workflows."}
      statusLabel={t("n8n.page.statusLabel") ?? "n8n run monitor"}
      statusValue="RUNNING"
      allowedActions={[
        t("n8n.page.allowed.inspectRunStatus") ?? "Inspect run status",
        t("n8n.page.allowed.reviewCheckpoints") ?? "Review request payload",
        t("n8n.page.allowed.holdForHumanReview") ?? "Wait on human approval"
      ]}
      forbiddenActions={[
        t("n8n.page.forbidden.automaticLaunch") ?? "Call real publish workflow",
        t("n8n.page.forbidden.productionDeploy") ?? "Launch automatically",
        t("n8n.page.forbidden.stateBypass") ?? "Skip human gate"
      ]}
    >
      <WorkflowRunTable namespace="n8n" runs={workflowRuns} />
    </PageFrame>
  );
}
