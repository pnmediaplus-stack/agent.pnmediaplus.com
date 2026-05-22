"use client";

import { PageFrame } from "@/components/shared/PageFrame";
import { MediaPipelineBoard } from "@/components/media/MediaPipelineBoard";
import { useI18n } from "@/lib/i18n/useI18n";
import { mediaPipeline } from "@/lib/mock-data";

export default function MediaPipelinePage() {
  const { t } = useI18n("media");

  return (
    <PageFrame
      title={t("media.page.title") ?? "Media Pipeline"}
      purpose={t("media.page.purpose") ?? "Visual board for intake, editing, and QA stages in the PN MEDIA PLUS department."}
      statusLabel={t("media.page.statusLabel") ?? "Media pipeline"}
      statusValue="PARTIAL"
      allowedActions={[
        t("media.page.allowed.inspectStageStatus") ?? "Inspect stage status",
        t("media.page.allowed.reviewHandoffs") ?? "Review handoffs",
        t("media.page.allowed.markForQA") ?? "Mark for QA"
      ]}
      forbiddenActions={[
        t("media.page.forbidden.autoPublish") ?? "Auto publish",
        t("media.page.forbidden.launchCampaign") ?? "Launch campaign",
        t("media.page.forbidden.bypassReview") ?? "Bypass review"
      ]}
    >
      <MediaPipelineBoard stages={mediaPipeline} />
    </PageFrame>
  );
}
