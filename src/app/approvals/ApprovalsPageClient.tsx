"use client";

import useSWR from "swr";
import { PageFrame } from "@/components/shared/PageFrame";
import { ApprovalPanel } from "@/components/gates/ApprovalPanel";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Approval } from "@/types/approval";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function ApprovalsPageClient() {
  const { t } = useI18n("approvals");
  const { data, error, isLoading } = useSWR<{ approvals: Approval[] }>("/api/approvals", fetcher);

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
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-white/50">Loading approvals...</div>
        </div>
      ) : error ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-red-400">Failed to load approvals</div>
        </div>
      ) : (
        <ApprovalPanel approvals={data?.approvals ?? []} />
      )}
    </PageFrame>
  );
}
