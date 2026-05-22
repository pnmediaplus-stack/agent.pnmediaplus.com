"use client";

import { PageFrame } from "@/components/shared/PageFrame";
import { ArtifactTable } from "@/components/artifacts/ArtifactTable";
import { useI18n } from "@/lib/i18n/useI18n";
import { artifacts } from "@/lib/mock-data";

export default function ArtifactsPage() {
  const { t } = useI18n("artifacts");

  return (
    <PageFrame
      title={t("artifacts.page.title") ?? "Artifacts"}
      purpose={t("artifacts.page.purpose") ?? "Artifact registry for briefs, prompts, assets, workflow notes, and related state."}
      statusLabel={t("artifacts.page.statusLabel") ?? "Artifact registry"}
      statusValue="PASS"
      allowedActions={[
        t("artifacts.page.allowed.inspectVersion") ?? "Inspect version",
        t("artifacts.page.allowed.markReadyReview") ?? "Mark ready for review",
        t("artifacts.page.allowed.viewOwnership") ?? "View ownership"
      ]}
      forbiddenActions={[
        t("artifacts.page.forbidden.autoPublish") ?? "Auto publish",
        t("artifacts.page.forbidden.launchAsset") ?? "Launch asset",
        t("artifacts.page.forbidden.bypassQA") ?? "Bypass QA"
      ]}
    >
      <ArtifactTable artifacts={artifacts} />
    </PageFrame>
  );
}
