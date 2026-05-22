import {
  PHASE2_PIPELINE_STATES,
  PHASE2_REQUIRED_ASSET_TYPES,
  type Phase2AgentTask,
  type Phase2Asset,
  type Phase2ContentItem,
  type Phase2PipelineState,
  type Phase2PerformanceRecord,
  type Phase2QaReview
} from "@/types/phase2";

const pipelineStateIndex = new Map<Phase2PipelineState, number>(
  PHASE2_PIPELINE_STATES.map((state, index) => [state, index])
);

export function getPhase2NextState(state: Phase2PipelineState): Phase2PipelineState | "terminal" {
  const index = PHASE2_PIPELINE_STATES.indexOf(state);
  return index >= 0 && index < PHASE2_PIPELINE_STATES.length - 1
    ? PHASE2_PIPELINE_STATES[index + 1]
    : "terminal";
}

export function sortPhase2ContentItems(items: Phase2ContentItem[]) {
  return [...items].sort((left, right) => {
    const stateDelta =
      (pipelineStateIndex.get(left.currentState) ?? 0) - (pipelineStateIndex.get(right.currentState) ?? 0);

    if (stateDelta !== 0) return stateDelta;
    return left.title.localeCompare(right.title);
  });
}

export function getPhase2RequiredAssets(contentItemId: string, assets: Phase2Asset[]) {
  const contentAssets = assets.filter((asset) => asset.contentItemId === contentItemId);
  const present = PHASE2_REQUIRED_ASSET_TYPES.filter((type) =>
    contentAssets.some((asset) => asset.assetType === type)
  );
  const missing = PHASE2_REQUIRED_ASSET_TYPES.filter((type) => !present.includes(type));

  return {
    totalRequired: PHASE2_REQUIRED_ASSET_TYPES.length,
    present,
    missing,
    complete: missing.length === 0
  };
}

export function getPhase2LatestReview(contentItemId: string, reviews: Phase2QaReview[]) {
  return [...reviews]
    .filter((review) => review.contentItemId === contentItemId)
    .sort((left, right) => `${right.reviewedAt}:${right.id}`.localeCompare(`${left.reviewedAt}:${left.id}`))[0];
}

export function getPhase2TaskOwnerRef(contentItemId: string, tasks: Phase2AgentTask[]) {
  const ownedTasks = tasks.filter((task) => task.contentItemId === contentItemId);
  return ownedTasks.length ? ownedTasks[ownedTasks.length - 1].ownerRef : "pending / incomplete";
}

export function getPhase2PublishEligibility(
  contentItemId: string,
  assets: Phase2Asset[],
  reviews: Phase2QaReview[]
) {
  const review = getPhase2LatestReview(contentItemId, reviews);
  const assetState = getPhase2RequiredAssets(contentItemId, assets);
  const ready =
    !!review &&
    review.verdict === "pass" &&
    review.averageScore >= 7 &&
    review.overclaimRisk <= 3 &&
    review.missingAsset === false &&
    assetState.complete;

  return {
    ready,
    gateState: !review ? "PENDING" : ready ? "READY" : "BLOCKED",
    riskState: !review ? "PENDING" : review.overclaimRisk > 3 || review.averageScore < 7 ? "HIGH" : "LOW",
    review
  } as const;
}

export function getPhase2LatestPerformanceSnapshot(contentItemId: string, records: Phase2PerformanceRecord[]) {
  return [...records]
    .filter((record) => record.contentItemId === contentItemId)
    .sort((left, right) => `${right.capturedAt}:${right.id}`.localeCompare(`${left.capturedAt}:${left.id}`))[0];
}
