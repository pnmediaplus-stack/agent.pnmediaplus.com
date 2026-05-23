"use client";

import { PageFrame } from "@/components/shared/PageFrame";
import { BusinessTruthExecutionSurface } from "@/components/business-truth/BusinessTruthExecutionSurface";
import { useI18n } from "@/lib/i18n/useI18n";

export default function BusinessTruthPage() {
  const { t } = useI18n("businessTruth");

  return (
    <PageFrame
      title={t("businessTruth.page.title") ?? "Business Truth execution"}
      purpose={t("businessTruth.page.purpose") ?? "Read-only Business Truth surface for billing, auth, identity, offer, and package truth."}
      statusLabel={t("businessTruth.page.statusLabel") ?? "Business Truth surface"}
      statusValue="APPROVED"
      statusDisplayValue={t("businessTruth.page.statusValue") ?? "Read-only"}
      allowedActions={[
        t("businessTruth.page.allowed.inspectTruth") ?? "Inspect truth",
        t("businessTruth.page.allowed.reviewHandoffs") ?? "Review handoff from Customer",
        t("businessTruth.page.allowed.previewCoreGovernance") ?? "Preview Core Governance boundary"
      ]}
      forbiddenActions={[
        t("businessTruth.page.forbidden.editBilling") ?? "Edit billing",
        t("businessTruth.page.forbidden.editIdentity") ?? "Edit identity",
        t("businessTruth.page.forbidden.selfMutate") ?? "Self-mutate truth"
      ]}
    >
      <BusinessTruthExecutionSurface />
    </PageFrame>
  );
}
