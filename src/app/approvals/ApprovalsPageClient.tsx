"use client";

import { PageFrame } from "@/components/shared/PageFrame";
import { ApprovalPanel } from "@/components/gates/ApprovalPanel";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Approval } from "@/types/approval";

export function ApprovalsPageClient({ approvals }: { approvals: Approval[] }) {
  const { t } = useI18n("approvals");

  return (
    <PageFrame
      title={t("approvals.page.title") ?? "Approvals"}
      purpose={t("approvals.page.purpose") ?? "Human approval view for pending requests, explicit decisions, and changes requested."}
      statusLabel={t("approvals.page.statusLabel") ?? "Approval console"}
      statusValue="REQUESTED"
      allowedActions={[
        t("approvals.page.allowed.requestApproval") ?? "Request Approval",
        t("approvals.page.allowed.approveAsHuman") ?? "Approve as Human",
        t("approvals.page.allowed.reject") ?? "Reject",
        t("approvals.page.allowed.requestChanges") ?? "Request Changes"
      ]}
      forbiddenActions={[
        t("approvals.page.forbidden.launchNow") ?? "Launch Now",
        t("approvals.page.forbidden.autoPublish") ?? "Auto Publish",
        t("approvals.page.forbidden.deployProduction") ?? "Deploy Production"
      ]}
    >
      <ApprovalPanel approvals={approvals} />
    </PageFrame>
  );
}
