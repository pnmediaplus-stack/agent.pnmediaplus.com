"use client";

import { PageFrame } from "@/components/shared/PageFrame";
import { Phase066EvidenceForm } from "@/components/phase066/Phase066EvidenceForm";
import { useI18n } from "@/lib/i18n/useI18n";

export default function Phase066EvidencePage() {
  const { t } = useI18n("phase066");

  return (
    <PageFrame
      title={t("page.title") ?? "Phase 066 evidence intake"}
      purpose={t("page.purpose") ?? "Controlled UI for submitting Marketing -> Media -> Operations evidence packets."}
      statusLabel={t("page.statusLabel") ?? "Evidence control plane"}
      statusValue="HOLD"
      statusDisplayValue={t("page.statusValue") ?? "Fail-closed write surface"}
      allowedActions={[
        t("page.allowed.validatePacket") ?? "Validate evidence packet",
        t("page.allowed.submitControlled") ?? "Submit to approved control-plane route",
        t("page.allowed.showState") ?? "Show ready / blocked state"
      ]}
      forbiddenActions={[
        t("page.forbidden.selfApprove") ?? "Self-approve",
        t("page.forbidden.publish") ?? "Publish or schedule",
        t("page.forbidden.n8nRuntime") ?? "Touch n8n runtime"
      ]}
    >
      <Phase066EvidenceForm />
    </PageFrame>
  );
}
