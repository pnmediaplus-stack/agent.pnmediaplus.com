"use client";

import { PageFrame } from "@/components/shared/PageFrame";
import { Phase067LeadIntakeView } from "@/components/phase067/Phase067LeadIntakeView";
import { useI18n } from "@/lib/i18n/useI18n";

export default function Phase067LeadsPage() {
  const { t } = useI18n("phase067");

  return (
    <PageFrame bannerKey="phase067_banner"
      title={t("page.title") ?? "Phase 067 lead intake"}
      purpose={t("page.purpose") ?? "Read-only lead funnel and performance memory intake surface."}
      statusLabel={t("page.statusLabel") ?? "Lead read model"}
      statusValue="REVIEW"
      statusDisplayValue={t("page.statusValue") ?? "Read-only"}
      allowedActions={[
        t("page.allowed.viewLeads") ?? "View leads",
        t("page.allowed.viewHistory") ?? "View lead history",
        t("page.allowed.traceMemory") ?? "Trace performance memory"
      ]}
      forbiddenActions={[
        t("page.forbidden.mutateLead") ?? "Mutate lead truth",
        t("page.forbidden.selfApprove") ?? "Self-approve",
        t("page.forbidden.runtimeAction") ?? "Trigger runtime action"
      ]}
    >
      <Phase067LeadIntakeView />
    </PageFrame>
  );
}
