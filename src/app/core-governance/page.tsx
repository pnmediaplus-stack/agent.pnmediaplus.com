"use client";

import { PageFrame } from "@/components/shared/PageFrame";
import { CoreGovernanceExecutionSurface } from "@/components/core-governance/CoreGovernanceExecutionSurface";
import { useI18n } from "@/lib/i18n/useI18n";

export default function CoreGovernancePage() {
  const { t } = useI18n("coreGovernance");

  return (
    <PageFrame
      title={t("coreGovernance.page.title") ?? "Core Governance execution"}
      purpose={t("coreGovernance.page.purpose") ?? "Read-only boundary surface for routing, normalization, reconciliation, blocking, and escalation."}
      statusLabel={t("coreGovernance.page.statusLabel") ?? "Core Governance surface"}
      statusValue="BLOCKED"
      statusDisplayValue={t("coreGovernance.page.statusValue") ?? "Boundary layer"}
      allowedActions={[
        t("coreGovernance.page.allowed.inspectBoundary") ?? "Inspect boundary",
        t("coreGovernance.page.allowed.reviewEscalations") ?? "Review escalations",
        t("coreGovernance.page.allowed.previewFinality") ?? "Preview final human finality"
      ]}
      forbiddenActions={[
        t("coreGovernance.page.forbidden.selfApprove") ?? "Self-approve",
        t("coreGovernance.page.forbidden.mutateTruth") ?? "Mutate truth",
        t("coreGovernance.page.forbidden.overrideBoundary") ?? "Override boundary"
      ]}
    >
      <CoreGovernanceExecutionSurface />
    </PageFrame>
  );
}
