"use client";

import { PageFrame } from "@/components/shared/PageFrame";
import { GateCard } from "@/components/gates/GateCard";
import { useI18n } from "@/lib/i18n/useI18n";
import { gates } from "@/lib/mock-data";

export default function GatesPage() {
  const { t } = useI18n("gates");

  return (
    <PageFrame
      title={t("gates.page.title") ?? "Gates"}
      purpose={t("gates.page.purpose") ?? "Gate and approval console for explicit human authority and state protection."}
      statusLabel={t("gates.page.statusLabel") ?? "Gate console"}
      statusValue="REVIEW_REQUIRED"
      allowedActions={[
        t("gates.page.allowed.requestApproval") ?? "Request Approval",
        t("gates.page.allowed.markReadyHumanReview") ?? "Mark Ready For Human Review",
        t("gates.page.allowed.reject") ?? "Reject"
      ]}
      forbiddenActions={[
        t("gates.page.forbidden.approveAutomatically") ?? "Approve automatically",
        t("gates.page.forbidden.launchNow") ?? "Launch now",
        t("gates.page.forbidden.deployProduction") ?? "Deploy production"
      ]}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {gates.map((gate) => (
          <GateCard key={gate.id} gate={gate} />
        ))}
      </div>
    </PageFrame>
  );
}
