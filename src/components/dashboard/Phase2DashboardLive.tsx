"use client";

import React, { type ReactNode } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageFrame } from "@/components/shared/PageFrame";
import { StateBadge } from "@/components/shared/StateBadge";
import { Phase4CampaignBuilder } from "./Phase4CampaignBuilder";
import { Phase5CMOOffice } from "./Phase5CMOOffice";
import { useI18n } from "@/lib/i18n/useI18n";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  PHASE2_PIPELINE_STATES,
  PHASE2_PERFORMANCE_METRIC_FIELDS,
  type Phase2AgentTask,
  type Phase2Asset,
  type Phase2ContentItem,
  type Phase2DashboardData,
  type Phase2DashboardLoadState,
  type Phase2PerformanceRecord,
  type Phase2QaReview
} from "@/types/phase2";
import {
  getPhase2LatestReview,
  getPhase2NextState,
  getPhase2PublishEligibility,
  getPhase2RequiredAssets,
  sortPhase2ContentItems
} from "@/lib/phase2-dashboard-derivations";

type SummaryCard = {
  label: string;
  value: string | number;
  note: string;
};

type Phase2DashboardProps = {
  data: Phase2DashboardData;
  loadState: Phase2DashboardLoadState;
  loadReason?: string;
};

function SectionFrame({
  title,
  description,
  children,
  className,
  bodyClassName
}: {
  title: string;
  description: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={`overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-950/80 shadow-md hover:shadow-lg transition-shadow duration-300 ${className ?? ""}`}
    >
      <div className="border-b border-cyan-200 dark:border-cyan-400/20 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md px-5 py-4">
        <div className="inline-flex max-w-full rounded-lg border border-cyan-200 dark:border-cyan-400/20 bg-cyan-50 dark:bg-cyan-400/10 px-3 py-1.5">
          <div className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">{title}</div>
        </div>
        <div className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{description}</div>
      </div>
      <div className={`p-5 ${bodyClassName ?? ""}`}>{children}</div>
    </section>
  );
}

import { CreateIdeaModal } from "./CreateIdeaModal";

function CampaignControlBar() {
  const { t } = useI18n("dashboard");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const tabs = [
    t("dashboard.controls.tabs.campaigns") ?? "Campaigns",
    t("dashboard.controls.tabs.adSets") ?? "Ad sets",
    t("dashboard.controls.tabs.ads") ?? "Ads",
    t("dashboard.controls.tabs.creative") ?? "Creative",
    t("dashboard.controls.tabs.qaGate") ?? "QA gate",
    t("dashboard.controls.tabs.performance") ?? "Performance"
  ];

  return (
    <>
      <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-950/80 shadow-md hover:shadow-lg transition-shadow duration-300">
        <div className="border-b border-cyan-200 dark:border-cyan-400/20 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md px-4 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex rounded-lg border border-cyan-200 dark:border-cyan-400/20 bg-cyan-50 dark:bg-cyan-400/10 px-3 py-1.5">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  {t("dashboard.controls.title") ?? "Locked campaign workspace"}
                </div>
              </div>
              <div className="mt-1 max-w-3xl text-xs leading-5 text-slate-500 dark:text-slate-400">
                {t("dashboard.controls.description") ??
                  "Vertical dashboard shell. No page-level horizontal mode. Wide content stays inside internal rails, tables, and snapshots."}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-2">
                {tabs.map((tab, index) => (
                  <span
                    key={tab}
                    className={[
                      "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.12em]",
                      index === 0
                        ? "border-cyan-400/40 bg-cyan-50 dark:bg-cyan-400/10 text-cyan-100"
                        : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 text-slate-700 dark:text-slate-200"
                    ].join(" ")}
                  >
                    {tab}
                  </span>
                ))}
              </div>
              <div className="h-6 w-px bg-slate-100 dark:bg-slate-800"></div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center rounded-full bg-cyan-500 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-cyan-950 hover:bg-cyan-400"
              >
                + Create Idea
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 px-4 pb-4">
          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-cyan-200">
            {t("dashboard.controls.fixedSidebar") ?? "Fixed sidebar"}
          </span>
          <span className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 dark:text-slate-200">
            {t("dashboard.controls.internalHorizontalScrollOnly") ?? "Internal horizontal scroll only"}
          </span>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">
            {t("dashboard.controls.campaignManagerInspired") ?? "Campaign-manager inspired"}
          </span>
        </div>
      </div>
      <CreateIdeaModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          // Trigger a hard reload or router refresh to fetch new dashboard data
          window.location.reload();
        }}
      />
    </>
  );
}

function SummaryGrid({ cards }: { cards: SummaryCard[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-950/80">
          <div className="border-b border-cyan-200 dark:border-cyan-400/20 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-100">{card.label}</div>
          </div>
          <div className="p-4">
            <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{card.value}</div>
            <div className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">{card.note}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function PipelineCard({
  item,
  assets,
  reviews,
  performanceRecords
}: {
  item: Phase2ContentItem;
  assets: Phase2Asset[];
  reviews: Phase2QaReview[];
  performanceRecords?: Phase2PerformanceRecord[];
}) {
  const { t } = useI18n("dashboard");
  const requiredAssets = getPhase2RequiredAssets(item.id, assets);
  const review = getPhase2LatestReview(item.id, reviews);
  const publish = getPhase2PublishEligibility(item.id, assets, reviews);
  const nextState = getPhase2NextState(item.currentState);
  const [isPublishing, setIsPublishing] = useState(false);

  const handlePublish = async () => {
    try {
      setIsPublishing(true);
      const res = await fetch('/api/phase2/approve-publish', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_item_id: item.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Publish failed');
      alert('🚀 Xuất bản thành công: ' + data.publish_url);
      window.location.reload();
    } catch (e: any) {
      alert('❌ Lỗi xuất bản: ' + e.message);
      setIsPublishing(false);
    }
  };

  const assetCompletionText = `${requiredAssets.present.length}/${requiredAssets.totalRequired} ${
    t("dashboard.labels.requiredAssets") ?? "required assets"
  }`;
  const qaGateText = review
    ? (t(`dashboard.verdict.${review.verdict}`) ?? review.verdict)
    : (t("dashboard.labels.pending") ?? "pending");
  const riskText = review
    ? review.overclaimRisk > 3 || review.averageScore < 7
      ? t("dashboard.labels.high") ?? "HIGH"
      : t("dashboard.labels.low") ?? "LOW"
    : (t("dashboard.labels.pendingUpper") ?? "PENDING");

  return (
    <div className="flex h-full min-h-0 w-[22rem] flex-none flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-950/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex max-w-full rounded-lg border border-cyan-200 dark:border-cyan-400/20 bg-cyan-50 dark:bg-cyan-400/10 px-3 py-1.5">
              <div className="break-words whitespace-normal text-sm font-semibold leading-6 text-slate-900 dark:text-white">{item.title}</div>
            </div>
            <div className="mt-1 break-words whitespace-normal text-xs leading-5 text-slate-500 dark:text-slate-400">{item.contentKey}</div>
            {item.brief ? (
              <div className="mt-2 max-h-16 overflow-hidden break-words whitespace-normal text-xs leading-5 text-slate-600 dark:text-slate-300">
                {item.brief}
              </div>
            ) : null}
          </div>
          <StateBadge label={item.currentState} displayLabel={t(`dashboard.state.${item.currentState}`) ?? item.currentState} />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 pr-1">
        <div className="grid gap-3 text-sm text-slate-600 dark:text-slate-300">
          <InfoRow label={t("dashboard.labels.owner") ?? "Owner"} value={item.ownerRef} />
          <InfoRow label={t("dashboard.labels.taskOwner") ?? "Task owner"} value={item.taskOwnerRef} />
          <InfoRow label={t("dashboard.labels.nextState") ?? "Next state"} value={t(`dashboard.state.${nextState}`) ?? nextState} />
          <InfoRow label={t("dashboard.labels.assetCompleteness") ?? "Asset completeness"} value={assetCompletionText} />
          <InfoRow label={t("dashboard.labels.qaGate") ?? "QA gate"} value={qaGateText} />
          <InfoRow label={t("dashboard.labels.riskState") ?? "Risk state"} value={riskText} />
          <InfoRow
            label={t("dashboard.labels.publishEligibility") ?? "Publish eligibility"}
            value={publish.ready ? (t("dashboard.labels.eligible") ?? "ELIGIBLE") : (t(`dashboard.publishState.${publish.gateState}`) ?? publish.gateState)}
          />
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-xs uppercase tracking-[0.22em] text-slate-500">{t("dashboard.labels.requiredAssets") ?? "Required assets"}</div>
          <div className="flex flex-wrap gap-2">
            {requiredAssets.present.map((assetType) => (
              <StateBadge key={assetType} label={assetType} displayLabel={t(`dashboard.assetType.${assetType}`) ?? assetType} />
            ))}
            {requiredAssets.missing.map((assetType) => (
              <span
                key={assetType}
                className="inline-flex items-center rounded-full border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-rose-600 dark:text-rose-200"
              >
                {`${t("dashboard.labels.missingPrefix") ?? "missing"}:${assetType}`}
              </span>
            ))}
          </div>
        </div>

        {item.currentState === 'QA_passed' && (
          <div className="mt-4 border-t border-slate-200 dark:border-slate-700/50 pt-4">
            <button
              onClick={handlePublish}
              disabled={isPublishing || !publish.ready}
              className={`w-full rounded-lg px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white shadow-sm transition-colors ${
                isPublishing || !publish.ready
                  ? "cursor-not-allowed bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                  : "bg-cyan-600 hover:bg-cyan-500"
              }`}
            >
              {isPublishing ? "Đang xuất bản..." : "🚀 Phê duyệt & Xuất bản"}
            </button>
            {!publish.ready && (
              <p className="mt-2 text-center text-[10px] text-rose-400">
                Chưa đủ điều kiện publish
              </p>
            )}
          </div>
        )}

        {item.currentState === 'published' && performanceRecords && performanceRecords.some(p => p.contentItemId === item.id) && (
          <div className="mt-4 border-t border-slate-200 dark:border-slate-700/50 pt-4">
            <div className="text-xs uppercase tracking-[0.22em] text-cyan-600 dark:text-cyan-400 mb-2">Performance Metrics</div>
            <div className="grid grid-cols-2 gap-2">
              {performanceRecords.filter(p => p.contentItemId === item.id).slice(0, 1).map((perf, idx) => (
                <React.Fragment key={idx}>
                  <div className="rounded-lg bg-white dark:bg-slate-900/50 p-2 text-center border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Views</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{perf.views?.toLocaleString() || 0}</div>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-slate-900/50 p-2 text-center border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Likes</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{perf.likes?.toLocaleString() || 0}</div>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-slate-900/50 p-2 text-center border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">Comments</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{perf.comments?.toLocaleString() || 0}</div>
                  </div>
                  <div className="rounded-lg bg-white dark:bg-slate-900/50 p-2 text-center border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase">CTR</div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white">{perf.CTR ? perf.CTR.toFixed(2) + '%' : '0%'}</div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[9.5rem_minmax(0,1fr)] items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 px-3 py-2">
      <span className="min-w-0 text-slate-500">{label}</span>
      <span className="min-w-0 break-words text-right font-medium text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}

function PipelineBoard({
  contentItems,
  assets,
  reviews,
  performanceRecords
}: {
  contentItems: Phase2ContentItem[];
  assets: Phase2Asset[];
  reviews: Phase2QaReview[];
  performanceRecords?: Phase2PerformanceRecord[];
}) {
  const { t } = useI18n("dashboard");
  const orderedItems = sortPhase2ContentItems(contentItems);

  if (!orderedItems.length) {
    return (
      <div className="flex h-full min-h-[18rem] items-center justify-center">
        <EmptyState
          title={t("dashboard.live.emptyTitle") ?? "No live Phase 2 records yet"}
          description={t("dashboard.live.emptyDescription") ?? "The dashboard is connected to Supabase, but the current dataset is empty."}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
        {PHASE2_PIPELINE_STATES.map((state) => (
          <StateBadge key={state} label={state} displayLabel={t(`dashboard.state.${state}`) ?? state} />
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-2">
        <div className="flex h-full w-max min-w-max items-stretch gap-4 snap-x snap-mandatory">
          {orderedItems.map((item) => {
            const review = getPhase2LatestReview(item.id, reviews);
            const publish = getPhase2PublishEligibility(item.id, assets, reviews);
            const nextState = getPhase2NextState(item.currentState);
            const requiredLabel =
              item.currentState === "idea"
                ? (t("dashboard.labels.start") ?? "start")
                : item.currentState === "published"
                  ? (t("dashboard.labels.terminal") ?? "terminal")
                  : (t(`dashboard.state.${nextState}`) ?? nextState);

            return (
              <div key={item.id} className="min-h-0 snap-start">
                      <PipelineCard 
                        key={item.id} 
                        item={item} 
                        assets={assets} 
                        reviews={reviews} 
                        performanceRecords={performanceRecords}
                      />
                <div className="mt-2 flex items-center justify-between px-1 text-xs text-slate-500">
                  <span>{requiredLabel}</span>
                  <span>
                    {review
                      ? publish.ready
                        ? (t("dashboard.labels.publishReady") ?? "publish ready")
                        : (t("dashboard.labels.gatePending") ?? "gate pending")
                      : (t("dashboard.labels.pendingQa") ?? "pending qa")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

type LedgerColumn = {
  key: string;
  label: string;
  width: string;
};

function LedgerShell({
  columns,
  rows,
  renderRow,
  minWidth,
  bodyMaxHeight = "max-h-[16rem]"
}: {
  columns: LedgerColumn[];
  rows: unknown[];
  renderRow: (row: any) => ReactNode[];
  minWidth: string;
  bodyMaxHeight?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-max" style={{ minWidth }}>
        <table className="w-full table-fixed border-separate border-spacing-0 text-left text-sm">
          <colgroup>
            {columns.map((column) => (
              <col key={column.key} style={{ width: column.width }} />
            ))}
          </colgroup>
          <thead className="text-xs uppercase tracking-[0.22em] text-slate-600 dark:text-slate-300">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/95 px-5 py-3 backdrop-blur">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        <div className={`${bodyMaxHeight} overflow-y-auto overflow-x-hidden`}>
          <table className="w-full table-fixed border-separate border-spacing-0 text-left text-sm">
            <colgroup>
              {columns.map((column) => (
                <col key={column.key} style={{ width: column.width }} />
              ))}
            </colgroup>
            <tbody className="divide-y divide-slate-800">
              {rows.map((row, index) => (
                <tr key={index} className="text-slate-600 dark:text-slate-300">
                  {renderRow(row).map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-5 py-4 align-top">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TaskView({
  tasks,
  contentItems
}: {
  tasks: Phase2AgentTask[];
  contentItems: Phase2ContentItem[];
}) {
  const { t } = useI18n("dashboard");
  const columns: LedgerColumn[] = [
    { key: "content", label: t("dashboard.columns.content") ?? "Content", width: "320px" },
    { key: "task", label: t("dashboard.columns.task") ?? "Task", width: "180px" },
    { key: "owner", label: t("dashboard.columns.owner") ?? "Owner", width: "180px" },
    { key: "state", label: t("dashboard.columns.state") ?? "State", width: "140px" },
    { key: "next", label: t("dashboard.columns.next") ?? "Next", width: "160px" }
  ];

  if (!tasks.length) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-950/80 p-5">
        <div className="inline-flex rounded-lg border border-cyan-200 dark:border-cyan-400/20 bg-cyan-50 dark:bg-cyan-400/10 px-3 py-1.5">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("dashboard.sections.taskLedgerTitle") ?? "Task ledger / agent_tasks"}
          </div>
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t("dashboard.sections.taskLedgerDescription") ?? "Campaign-style task rows with wide columns kept inside the panel."}
        </div>
        <div className="mt-4">
          <EmptyState
            title={t("dashboard.live.emptyTitle") ?? "No live Phase 2 records yet"}
            description={t("dashboard.live.emptyDescription") ?? "The dashboard is connected to Supabase, but the current dataset is empty."}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-h-[24rem] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-950/80">
      <div className="border-b border-cyan-200 dark:border-cyan-400/20 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md px-5 py-4">
        <div className="inline-flex rounded-lg border border-cyan-200 dark:border-cyan-400/20 bg-cyan-50 dark:bg-cyan-400/10 px-3 py-1.5">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("dashboard.sections.taskLedgerTitle") ?? "Task ledger / agent_tasks"}
          </div>
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t("dashboard.sections.taskLedgerDescription") ?? "Campaign-style task rows with wide columns kept inside the panel."}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <LedgerShell
          columns={columns}
          rows={tasks}
          minWidth="980px"
          renderRow={(task) => {
            const currentTask = task as Phase2AgentTask;
            const content = contentItems.find((row) => row.id === currentTask.contentItemId);
            return [
              <>
                <div className="font-medium text-slate-900 dark:text-white">{content?.title ?? (t("dashboard.labels.pending") ?? "pending")}</div>
                <div className="text-xs text-slate-500">{content?.contentKey ?? currentTask.contentItemId}</div>
              </>,
              t(`dashboard.taskKind.${currentTask.taskKind}`) ?? currentTask.taskKind,
              currentTask.ownerRef,
              <StateBadge label={currentTask.state} displayLabel={t(`dashboard.taskState.${currentTask.state}`) ?? currentTask.state} />,
              <span className="text-slate-900 dark:text-white">
                {content
                  ? (t(`dashboard.state.${getPhase2NextState(content.currentState)}`) ?? getPhase2NextState(content.currentState))
                  : (t("dashboard.labels.pending") ?? "pending")}
              </span>
            ];
          }}
        />
      </div>
    </div>
  );
}

function AssetView({
  assets,
  contentItems
}: {
  assets: Phase2Asset[];
  contentItems: Phase2ContentItem[];
}) {
  const { t } = useI18n("dashboard");
  const columns: LedgerColumn[] = [
    { key: "content", label: t("dashboard.columns.content") ?? "Content", width: "340px" },
    { key: "asset", label: t("dashboard.columns.assetType") ?? "Asset type", width: "180px" },
    { key: "owner", label: t("dashboard.columns.owner") ?? "Owner", width: "180px" },
    { key: "evidence", label: t("dashboard.columns.evidence") ?? "Evidence", width: "220px" }
  ];

  if (!assets.length) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-950/80 p-5">
        <div className="inline-flex rounded-lg border border-cyan-200 dark:border-cyan-400/20 bg-cyan-50 dark:bg-cyan-400/10 px-3 py-1.5">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("dashboard.sections.assetsTitle") ?? "Creative assets / assets"}
          </div>
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t("dashboard.sections.assetsDescription") ?? "Research, visual, and caption assets stay in a single horizontal ledger before QA_ready."}
        </div>
        <div className="mt-4">
          <EmptyState
            title={t("dashboard.live.emptyTitle") ?? "No live Phase 2 records yet"}
            description={t("dashboard.live.emptyDescription") ?? "The dashboard is connected to Supabase, but the current dataset is empty."}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-h-[24rem] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-950/80">
      <div className="border-b border-cyan-200 dark:border-cyan-400/20 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md px-5 py-4">
        <div className="inline-flex rounded-lg border border-cyan-200 dark:border-cyan-400/20 bg-cyan-50 dark:bg-cyan-400/10 px-3 py-1.5">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("dashboard.sections.assetsTitle") ?? "Creative assets / assets"}
          </div>
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t("dashboard.sections.assetsDescription") ?? "Research, visual, and caption assets stay in a single horizontal ledger before QA_ready."}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <LedgerShell
          columns={columns}
          rows={assets}
          minWidth="920px"
          renderRow={(asset) => {
            const currentAsset = asset as Phase2Asset;
            const content = contentItems.find((row) => row.id === currentAsset.contentItemId);
            return [
              <>
                <div className="font-medium text-slate-900 dark:text-white">{content?.title ?? (t("dashboard.labels.pending") ?? "pending")}</div>
                <div className="text-xs text-slate-500">
                  {content ? (t(`dashboard.state.${content.currentState}`) ?? content.currentState) : (t("dashboard.labels.pending") ?? "pending")}
                </div>
              </>,
              <StateBadge label={currentAsset.assetType} displayLabel={t(`dashboard.assetType.${currentAsset.assetType}`) ?? currentAsset.assetType} />,
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400" title={currentAsset.ownerRef}>
                {currentAsset.ownerRef.split('-')[0]}...
              </span>,
              <div className="max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap text-xs text-slate-600 dark:text-slate-300" title={currentAsset.assetUri}>
                {currentAsset.assetUri && currentAsset.assetUri.startsWith('http') ? (
                  <a href={currentAsset.assetUri} target="_blank" rel="noreferrer" className="text-cyan-600 dark:text-cyan-400 hover:underline">
                    [Link Hình Ảnh]
                  </a>
                ) : (
                  currentAsset.assetUri ? currentAsset.assetUri : (t("dashboard.labels.pending") ?? "pending")
                )}
              </div>
            ];
          }}
        />
      </div>
    </div>
  );
}

function QAView({
  contentItems,
  assets,
  reviews
}: {
  contentItems: Phase2ContentItem[];
  assets: Phase2Asset[];
  reviews: Phase2QaReview[];
}) {
  const { t } = useI18n("dashboard");
  const columns: LedgerColumn[] = [
    { key: "content", label: t("dashboard.columns.content") ?? "Content", width: "280px" },
    { key: "score", label: t("dashboard.columns.score") ?? "Score", width: "110px" },
    { key: "risk", label: t("dashboard.columns.risk") ?? "Risk", width: "110px" },
    { key: "missing", label: t("dashboard.columns.missingAsset") ?? "Missing asset", width: "140px" },
    { key: "verdict", label: t("dashboard.columns.verdict") ?? "Verdict", width: "140px" },
    { key: "evidence", label: t("dashboard.columns.evidence") ?? "Evidence", width: "220px" },
    { key: "publish", label: t("dashboard.columns.publish") ?? "Publish", width: "140px" }
  ];

  if (!contentItems.length) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-950/80 p-5">
        <div className="inline-flex rounded-lg border border-cyan-200 dark:border-cyan-400/20 bg-cyan-50 dark:bg-cyan-400/10 px-3 py-1.5">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("dashboard.sections.qaTitle") ?? "QA gate / qa_reviews"}
          </div>
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t("dashboard.sections.qaDescription") ?? "Reviews are read as approval gates, with risk and publish eligibility visible at a glance."}
        </div>
        <div className="mt-4">
          <EmptyState
            title={t("dashboard.live.emptyTitle") ?? "No live Phase 2 records yet"}
            description={t("dashboard.live.emptyDescription") ?? "The dashboard is connected to Supabase, but the current dataset is empty."}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-h-[24rem] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-950/80">
      <div className="border-b border-cyan-200 dark:border-cyan-400/20 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md px-5 py-4">
        <div className="inline-flex rounded-lg border border-cyan-200 dark:border-cyan-400/20 bg-cyan-50 dark:bg-cyan-400/10 px-3 py-1.5">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("dashboard.sections.qaTitle") ?? "QA gate / qa_reviews"}
          </div>
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t("dashboard.sections.qaDescription") ?? "Reviews are read as approval gates, with risk and publish eligibility visible at a glance."}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <LedgerShell
          columns={columns}
          rows={contentItems}
          minWidth="1080px"
          renderRow={(content) => {
            const currentContent = content as Phase2ContentItem;
            const review = getPhase2LatestReview(currentContent.id, reviews);
            const publish = getPhase2PublishEligibility(currentContent.id, assets, reviews);
            return [
              <>
                <div className="font-medium text-slate-900 dark:text-white">{currentContent.title}</div>
                <div className="text-xs text-slate-500">{t(`dashboard.state.${currentContent.currentState}`) ?? currentContent.currentState}</div>
              </>,
              review ? review.averageScore.toFixed(1) : (t("dashboard.labels.pending") ?? "pending"),
              review ? review.overclaimRisk : (t("dashboard.labels.pending") ?? "pending"),
              review
                ? review.missingAsset
                  ? (t("dashboard.boolean.yes") ?? "Yes")
                  : (t("dashboard.boolean.no") ?? "No")
                : (t("dashboard.labels.pending") ?? "pending"),
              <StateBadge
                label={review ? review.verdict : (t("dashboard.labels.pending") ?? "pending")}
                displayLabel={review ? (t(`dashboard.verdict.${review.verdict}`) ?? review.verdict) : (t("dashboard.labels.pending") ?? "pending")}
              />,
              <div className="text-xs text-slate-500 dark:text-slate-400 break-all max-w-[200px] max-h-20 overflow-y-auto">{review?.evidenceRef ?? (t("dashboard.labels.pending") ?? "pending")}</div>,
              <StateBadge
                label={publish.ready ? "ELIGIBLE" : publish.gateState}
                displayLabel={publish.ready ? (t("dashboard.labels.eligible") ?? "ELIGIBLE") : (t(`dashboard.publishState.${publish.gateState}`) ?? publish.gateState)}
              />
            ];
          }}
        />
      </div>
    </div>
  );
}

function PerformanceView({
  contentItems,
  records
}: {
  contentItems: Phase2ContentItem[];
  records: Phase2PerformanceRecord[];
}) {
  const { t } = useI18n("dashboard");
  const columns: LedgerColumn[] = [
    { key: "content", label: t("dashboard.columns.content") ?? "Content", width: "280px" },
    { key: "owner", label: t("dashboard.columns.owner") ?? "Owner", width: "130px" },
    ...PHASE2_PERFORMANCE_METRIC_FIELDS.map((metric) => ({
      key: metric,
      label: t(`dashboard.performanceMetric.${metric}`) ?? metric,
      width: "120px"
    })),
    { key: "source", label: t("dashboard.columns.source") ?? "Source", width: "200px" },
    { key: "captured", label: t("dashboard.columns.captured") ?? "Captured", width: "180px" }
  ];

  if (!records.length) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-950/80 p-5">
        <div className="inline-flex rounded-lg border border-cyan-200 dark:border-cyan-400/20 bg-cyan-50 dark:bg-cyan-400/10 px-3 py-1.5">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("dashboard.sections.performanceTitle") ?? "Performance ledger / performance_records"}
          </div>
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t("dashboard.sections.performanceDescription") ?? "Post-publish snapshots only. Missing metrics render as pending / incomplete."}
        </div>
        <div className="mt-4">
          <EmptyState
            title={t("dashboard.live.emptyTitle") ?? "No live Phase 2 records yet"}
            description={t("dashboard.live.emptyDescription") ?? "The dashboard is connected to Supabase, but the current dataset is empty."}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-h-[24rem] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-950/80">
      <div className="border-b border-cyan-200 dark:border-cyan-400/20 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md px-5 py-4">
        <div className="inline-flex rounded-lg border border-cyan-200 dark:border-cyan-400/20 bg-cyan-50 dark:bg-cyan-400/10 px-3 py-1.5">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            {t("dashboard.sections.performanceTitle") ?? "Performance ledger / performance_records"}
          </div>
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t("dashboard.sections.performanceDescription") ?? "Post-publish snapshots only. Missing metrics render as pending / incomplete."}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <LedgerShell
          columns={columns}
          rows={records}
          minWidth="1680px"
          bodyMaxHeight="max-h-[14rem]"
          renderRow={(record) => {
            const currentRecord = record as Phase2PerformanceRecord;
            const content = contentItems.find((row) => row.id === currentRecord.contentItemId);
            return [
              <>
                <div className="font-medium text-slate-900 dark:text-white">{content?.title ?? (t("dashboard.labels.pending") ?? "pending")}</div>
                <div className="text-xs text-slate-500">{content?.currentState ?? (t("dashboard.labels.pending") ?? "pending")}</div>
              </>,
              currentRecord.ownerRef,
              ...PHASE2_PERFORMANCE_METRIC_FIELDS.map((metric) => {
                const value = currentRecord[metric];
                return (
                  <span className="text-slate-900 dark:text-white">
                    {typeof value === "number" ? value : (t("dashboard.labels.pendingIncomplete") ?? "pending / incomplete")}
                  </span>
                );
              }),
              <span className="text-xs text-slate-500 dark:text-slate-400">{currentRecord.sourceRef}</span>,
              <span className="text-xs text-slate-500 dark:text-slate-400">{currentRecord.capturedAt}</span>
            ];
          }}
        />
      </div>
    </div>
  );
}

export function Phase2Dashboard({
  data,
  loadState,
  loadReason
}: Phase2DashboardProps) {
  const { t } = useI18n("dashboard");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [liveData, setLiveData] = useState<Phase2DashboardData>(data);
  const [lastSyncAt, setLastSyncAt] = useState(() => new Date().toISOString());

  // Sync state with server data (pagination/refresh)
  useEffect(() => {
    setLiveData(data);
    setLastSyncAt(new Date().toISOString());
  }, [data]);

  // Delta Polling
  useEffect(() => {
    if (loadState !== "ready" || liveData.contentItems.length === 0) return;

    const interval = setInterval(async () => {
      try {
        const page = parseInt(searchParams.get("page") || "1", 10) || 1;
        const res = await fetch("/api/phase2/sync", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page,
            limit: 20,
            since: lastSyncAt,
            ids: liveData.contentItems.map(i => i.id)
          })
        });

        if (!res.ok) return;

        const result = await res.json();
        
        if (result.needsFullRefresh) {
          router.refresh();
          return;
        }

        if (result.deltas) {
          setLastSyncAt(new Date().toISOString());
          setLiveData(prev => {
            const next = { ...prev };
            
            const mergeArray = (prevArr: any[], deltaArr: any[]) => {
              if (!deltaArr || !deltaArr.length) return prevArr;
              const merged = prevArr.map(item => {
                const updated = deltaArr.find(d => d.id === item.id);
                return updated ? { ...item, ...updated } : item;
              });
              const newItems = deltaArr.filter(d => !prevArr.some(i => i.id === d.id));
              return [...merged, ...newItems];
            };

            next.contentItems = mergeArray(prev.contentItems, result.deltas.contentItems);
            next.agentTasks = mergeArray(prev.agentTasks, result.deltas.tasks);
            next.qaReviews = mergeArray(prev.qaReviews, result.deltas.reviews);
            next.assets = mergeArray(prev.assets, result.deltas.assets);
            next.performanceRecords = mergeArray(prev.performanceRecords, result.deltas.performance);
            next.publishRecords = mergeArray(prev.publishRecords, result.deltas.publishRecords);
            next.lessonsLearned = mergeArray(prev.lessonsLearned, result.deltas.lessons);
            
            return next;
          });
        }
      } catch (e) {
         console.error("Delta Polling Failed", e);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [liveData.contentItems, lastSyncAt, loadState, router, searchParams]);

  const publishedCount = liveData.contentItems.filter((item) => item.currentState === "published").length;
  const eligibleCount = liveData.contentItems.filter((item) => getPhase2PublishEligibility(item.id, liveData.assets, liveData.qaReviews).ready).length;
  const qaReadyCount = liveData.contentItems.filter((item) => item.currentState === "QA_ready").length;

  const summaryCards: SummaryCard[] = [
    {
      label: t("dashboard.metrics.contentItems.label") ?? "Content items",
      value: liveData.contentItems.length,
      note: t("dashboard.metrics.contentItems.note") ?? "Canonical Phase 2 pipeline root objects."
    },
    {
      label: t("dashboard.metrics.qaReady.label") ?? "QA ready",
      value: qaReadyCount,
      note: t("dashboard.metrics.qaReady.note") ?? "Only items with all 3 required assets reach QA_ready."
    },
    {
      label: t("dashboard.metrics.publishEligible.label") ?? "Publish eligible",
      value: eligibleCount,
      note: t("dashboard.metrics.publishEligible.note") ?? "QA passed and thresholds met."
    },
    {
      label: t("dashboard.metrics.published.label") ?? "Published",
      value: publishedCount,
      note: t("dashboard.metrics.published.note") ?? "Performance snapshots are post-publish only."
    }
  ];

  return (
    <PageFrame bannerKey="media_pipeline_banner"
      className="flex min-h-full min-w-0 flex-col overflow-hidden"
      contentClassName="flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-hidden pr-1"
      title={t("dashboard.page.title") ?? "Dashboard"}
      purpose={
        t("dashboard.page.purpose") ??
        "Canonical Phase 2 content pipeline dashboard for content_items, agent_tasks, assets, qa_reviews, and performance_records."
      }
      statusLabel={t("dashboard.page.statusLabel") ?? "Phase 2 live pipeline"}
      statusValue={loadState === "ready" ? (t("dashboard.live.readyBadge") ?? "LIVE") : (t("dashboard.live.blockedBadge") ?? "BLOCKED")}
      allowedActions={[
        t("dashboard.page.allowed.inspectPipeline") ?? "Inspect pipeline",
        t("dashboard.page.allowed.reviewOwnership") ?? "Review task ownership",
        t("dashboard.page.allowed.checkEligibility") ?? "Check publish eligibility"
      ]}
      forbiddenActions={[
        t("dashboard.page.forbidden.autoPublish") ?? "Auto publish",
        t("dashboard.page.forbidden.autoApprove") ?? "Auto approve",
        t("dashboard.page.forbidden.bypassQa") ?? "Bypass QA"
      ]}
    >
      {loadState === "blocked" ? (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-5 py-4 text-rose-100"
        >
          <div className="text-sm font-semibold">
            {t("dashboard.live.blockedTitle") ?? "Live Supabase read blocked"}
          </div>
          <div className="mt-1 text-xs leading-5 text-rose-100/80">
            {loadReason ?? (t("dashboard.live.blockedDescription") ?? "Phase 2 dashboard stays fail-closed until live data is available.")}
          </div>
        </div>
      ) : null}

      <Phase5CMOOffice />
      <CampaignControlBar />
      <Phase4CampaignBuilder />
      <SummaryGrid cards={summaryCards} />

      <SectionFrame
        className="flex min-h-0 min-w-0 flex-col"
        bodyClassName="min-h-0 min-w-0 flex-1 overflow-hidden"
        title={t("dashboard.sections.pipelineBoard") ?? "Pipeline board (content_items)"}
        description={t("dashboard.sections.pipelineBoardDescription") ?? "idea → research_ready → visual_ready → caption_ready → QA_ready → QA_passed → scheduled → published"}
      >
        <PipelineBoard
            contentItems={liveData.contentItems}
            assets={liveData.assets}
            reviews={liveData.qaReviews}
            performanceRecords={liveData.performanceRecords}
          />
        
        <div className="mt-4 flex items-center justify-between border-t border-slate-200 dark:border-slate-700/50 pt-4 px-2">
          <button
            onClick={() => {
              if (liveData.page && liveData.page > 1) {
                router.push(`?page=${liveData.page - 1}`);
              }
            }}
            disabled={!liveData.page || liveData.page === 1}
            className="rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <div className="text-sm font-medium text-cyan-600 dark:text-cyan-400">
            Page {liveData.page || 1}
          </div>
          <button
            onClick={() => {
              router.push(`?page=${(liveData.page || 1) + 1}`);
            }}
            disabled={!liveData.hasNextPage}
            className="rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      </SectionFrame>

      <div className="space-y-6">
        <TaskView tasks={liveData.agentTasks} contentItems={liveData.contentItems} />
        <AssetView assets={liveData.assets} contentItems={liveData.contentItems} />
        <QAView contentItems={liveData.contentItems} assets={liveData.assets} reviews={liveData.qaReviews} />
        <PerformanceView contentItems={liveData.contentItems} records={liveData.performanceRecords} />
        
        <SectionFrame
          title="🧠 AI Knowledge Base (Lessons Learned)"
          description="Những đúc kết thành công được AI tự động phân tích từ dữ liệu thật"
        >
          <div className="p-5">
            {(!liveData.lessonsLearned || liveData.lessonsLearned.length === 0) ? (
              <div className="text-center text-sm text-slate-500 py-4">
                Chưa có dữ liệu bài học nào được tạo ra.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {liveData.lessonsLearned.map((lesson) => (
                  <div key={lesson.id} className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-2 opacity-50 text-emerald-600 dark:text-emerald-400 group-hover:opacity-100 transition-opacity">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-2">{lesson.metricHighlight}</div>
                    <div className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{lesson.lessonText}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionFrame>
      </div>
    </PageFrame>
  );
}

