"use client";

import { PageFrame } from "@/components/shared/PageFrame";
import { CoreGovernanceExecutionSurface } from "@/components/core-governance/CoreGovernanceExecutionSurface";
import { useI18n } from "@/lib/i18n/useI18n";

export default function CoreGovernancePage() {
  const { t } = useI18n("coreGovernance");

  return (
    <PageFrame
      title={t("coreGovernance.page.title") ?? "Vận hành Core Governance"}
      purpose={t("coreGovernance.page.purpose") ?? "Surface boundary chỉ đọc cho routing, normalization, reconciliation, block và escalation."}
      statusLabel={t("coreGovernance.page.statusLabel") ?? "Bề mặt Core Governance"}
      statusValue="BLOCKED"
      statusDisplayValue={t("coreGovernance.page.statusValue") ?? "Lớp ranh giới"}
      allowedActions={[
        t("coreGovernance.page.allowed.inspectBoundary") ?? "Xem boundary",
        t("coreGovernance.page.allowed.reviewEscalations") ?? "Xem escalations",
        t("coreGovernance.page.allowed.previewFinality") ?? "Xem final human finality"
      ]}
      forbiddenActions={[
        t("coreGovernance.page.forbidden.selfApprove") ?? "Tự phê duyệt",
        t("coreGovernance.page.forbidden.mutateTruth") ?? "Mutation truth",
        t("coreGovernance.page.forbidden.overrideBoundary") ?? "Vượt boundary"
      ]}
    >
      <CoreGovernanceExecutionSurface />
    </PageFrame>
  );
}
