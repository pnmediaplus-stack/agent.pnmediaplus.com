"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { PageFrame } from "@/components/shared/PageFrame";
import { StateBadge } from "@/components/shared/StateBadge";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Phase2DashboardData } from "@/types/phase2";
import {
  PHASE2_PIPELINE_STATES,
  PHASE2_PERFORMANCE_METRIC_FIELDS,
  getPhase2PublishEligibility,
  getPhase2RequiredAssets,
  getPhase2LatestReview,
  getPhase2NextState,
  aggregatePerformanceData,
  aggregatePipelineStates
} from "@/lib/phase2-dashboard-contract";

const PerformanceChart = dynamic(() => import("./charts/PerformanceChart"), {
  loading: () => <div className="h-[300px] w-full animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/50" />,
  ssr: false
});

const PipelineFunnelChart = dynamic(() => import("./charts/PipelineFunnelChart"), {
  loading: () => <div className="h-[300px] w-full animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/50" />,
  ssr: false
});

const DashboardDataContext = createContext<Phase2DashboardData | null>(null);

function useDashboardData() {
  const context = useContext(DashboardDataContext);
  if (!context) throw new Error("useDashboardData must be used within DashboardDataContext.Provider");
  return context;
}

type SummaryCard = {
  label: string;
  value: string | number;
  note: string;
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
      className={`overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/80 shadow-[0_0_0_1px_rgba(15,23,42,0.24)] ${
        className ?? ""
      }`}
    >
      <div className="border-b border-cyan-200 dark:border-cyan-400/20 bg-white dark:bg-slate-900 px-5 py-4">
        <div className="inline-flex max-w-full rounded-lg border border-cyan-200 dark:border-cyan-400/20 bg-cyan-50 dark:bg-cyan-400/10 px-3 py-1.5">
          <div className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white">{title}</div>
        </div>
        <div className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{description}</div>
      </div>
      <div className={`p-5 ${bodyClassName ?? ""}`}>{children}</div>
    </section>
  );
}

export type DashboardTab = "pipeline" | "tasks" | "assets" | "qa" | "performance";

function CampaignControlBar({
  activeTab,
  onTabChange
}: {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}) {
  const { t } = useI18n("dashboard");
  const tabs: { id: DashboardTab; label: string }[] = [
    { id: "pipeline", label: t("dashboard.controls.tabs.pipeline") ?? "Pipeline" },
    { id: "tasks", label: t("dashboard.controls.tabs.tasks") ?? "Tasks" },
    { id: "assets", label: t("dashboard.controls.tabs.assets") ?? "Assets" },
    { id: "qa", label: t("dashboard.controls.tabs.qaGate") ?? "QA gate" },
    { id: "performance", label: t("dashboard.controls.tabs.performance") ?? "Performance" }
  ];

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/80 shadow-[0_0_0_1px_rgba(15,23,42,0.24)]">
      <div className="border-b border-cyan-200 dark:border-cyan-400/20 bg-white dark:bg-slate-900 px-4 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="inline-flex rounded-lg border border-cyan-200 dark:border-cyan-400/20 bg-cyan-50 dark:bg-cyan-400/10 px-3 py-1.5">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">{t("dashboard.controls.title") ?? "Locked campaign workspace"}</div>
          </div>
          <div className="mt-1 max-w-3xl text-xs leading-5 text-slate-500 dark:text-slate-400">
            {t("dashboard.controls.description") ??
              "Vertical dashboard shell. No page-level horizontal mode. Wide content stays inside internal rails, tables, and snapshots."}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={[
                  "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-[0.12em] transition",
                  isActive
                    ? "border-cyan-400/40 bg-cyan-50 dark:bg-cyan-400/10 text-cyan-100"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/70 text-slate-700 dark:text-slate-200 hover:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
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
  );
}

function SummaryGrid({ cards }: { cards: SummaryCard[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <div key={card.label} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/80">
          <div className="border-b border-cyan-200 dark:border-cyan-400/20 bg-white dark:bg-slate-900/90 px-4 py-3">
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

function PipelineCard({ contentItemId }: { contentItemId: string }) {
  const { t } = useI18n("dashboard");
  const data = useDashboardData();
  const item = data.contentItems.find((row) => row.id === contentItemId);
  if (!item) return null;

  const assets = getPhase2RequiredAssets(item.id, data.assets);
  const review = getPhase2LatestReview(item.id, data.qaReviews);
  const publish = getPhase2PublishEligibility(item.id, data.qaReviews, data.assets);
  const nextState = getPhase2NextState(item.currentState);

  const assetCompletionText = `${assets.present.length}/${assets.totalRequired} ${t("dashboard.labels.requiredAssets") ?? "required assets"}`;
  const qaGateText = review ? (t(`dashboard.verdict.${review.verdict}`) ?? review.verdict) : (t("dashboard.labels.pending") ?? "pending");
  const riskText = review
    ? review.overclaimRisk > 3 || review.averageScore < 7
      ? t("dashboard.labels.high") ?? "HIGH"
      : t("dashboard.labels.low") ?? "LOW"
    : (t("dashboard.labels.pendingUpper") ?? "PENDING");

  return (
    <div className="flex h-full min-h-0 w-[22rem] flex-none flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/80 shadow-[0_0_0_1px_rgba(15,23,42,0.16)]">
      <div className="border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/90 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
            <div className="inline-flex max-w-full rounded-lg border border-cyan-200 dark:border-cyan-400/20 bg-cyan-50 dark:bg-cyan-400/10 px-3 py-1.5">
              <div className="break-words whitespace-normal text-sm font-semibold leading-6 text-slate-900 dark:text-white">{item.title}</div>
            </div>
            <div className="mt-1 break-words whitespace-normal text-xs leading-5 text-slate-500 dark:text-slate-400">{item.contentKey}</div>
        </div>
        <StateBadge label={item.currentState} />
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
            {assets.present.map((assetType) => (
              <StateBadge key={assetType} label={assetType} displayLabel={t(`dashboard.assetType.${assetType}`) ?? assetType} />
            ))}
            {assets.missing.map((assetType) => (
              <span
                key={assetType}
              className="inline-flex items-center rounded-full border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-rose-600 dark:text-rose-200"
              >
                {`${t("dashboard.labels.missingPrefix") ?? "missing"}:${assetType}`}
              </span>
            ))}
          </div>
        </div>
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

function PipelineBoard() {
  const { t } = useI18n("dashboard");
  const data = useDashboardData();
  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
        <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1">
        {PHASE2_PIPELINE_STATES.map((state) => (
          <StateBadge key={state} label={state} displayLabel={t(`dashboard.state.${state}`) ?? state} />
        ))}
      </div>

      <div className="shrink-0 mb-4">
        <PipelineFunnelChart data={aggregatePipelineStates(data.contentItems)} />
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-hidden pb-2">
        <div className="flex h-full w-max min-w-max items-stretch gap-4 snap-x snap-mandatory">
          {data.contentItems.map((item) => {
            const review = getPhase2LatestReview(item.id, data.qaReviews);
            const publish = getPhase2PublishEligibility(item.id, data.qaReviews, data.assets);
            const nextState = getPhase2NextState(item.currentState);
            const requiredLabel =
              item.currentState === "idea"
                ? (t("dashboard.labels.start") ?? "start")
                : item.currentState === "published"
                  ? (t("dashboard.labels.terminal") ?? "terminal")
                  : (t(`dashboard.state.${nextState}`) ?? nextState);

            return (
              <div key={item.id} className="min-h-0 snap-start">
                <PipelineCard contentItemId={item.id} />
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
                <th
                  key={column.key}
                  className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/95 px-5 py-3 backdrop-blur"
                >
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

function TaskView() {
  const { t } = useI18n("dashboard");
  const data = useDashboardData();
  const columns: LedgerColumn[] = [
    { key: "content", label: t("dashboard.columns.content") ?? "Content", width: "320px" },
    { key: "task", label: t("dashboard.columns.task") ?? "Task", width: "180px" },
    { key: "owner", label: t("dashboard.columns.owner") ?? "Owner", width: "180px" },
    { key: "state", label: t("dashboard.columns.state") ?? "State", width: "140px" },
    { key: "next", label: t("dashboard.columns.next") ?? "Next", width: "160px" }
  ];

  return (
    <div className="flex max-h-[24rem] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/80">
      <div className="border-b border-cyan-200 dark:border-cyan-400/20 bg-white dark:bg-slate-900/90 px-5 py-4">
        <div className="inline-flex rounded-lg border border-cyan-200 dark:border-cyan-400/20 bg-cyan-50 dark:bg-cyan-400/10 px-3 py-1.5">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{t("dashboard.sections.taskLedgerTitle") ?? "Task ledger / agent_tasks"}</div>
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("dashboard.sections.taskLedgerDescription") ?? "Campaign-style task rows with wide columns kept inside the panel."}</div>
      </div>
      <div className="min-h-0 flex-1">
        <LedgerShell
          columns={columns}
          rows={data.agentTasks}
          minWidth="980px"
          renderRow={(task: Phase2DashboardData["agentTasks"][number]) => {
            const content = data.contentItems.find((row) => row.id === task.contentItemId);
            return [
              <>
                <div className="font-medium text-slate-900 dark:text-white">{content?.title ?? (t("dashboard.labels.pending") ?? "pending")}</div>
                <div className="text-xs text-slate-500">{content?.contentKey ?? task.contentItemId}</div>
              </>,
              t(`dashboard.taskKind.${task.taskKind}`) ?? task.taskKind,
              task.ownerRef,
              <StateBadge label={task.state} displayLabel={t(`dashboard.taskState.${task.state}`) ?? task.state} />,
              <span className="text-slate-900 dark:text-white">
                {content ? (t(`dashboard.state.${getPhase2NextState(content.currentState)}`) ?? getPhase2NextState(content.currentState)) : (t("dashboard.labels.pending") ?? "pending")}
              </span>
            ];
          }}
        />
      </div>
    </div>
  );
}

function AssetView() {
  const { t } = useI18n("dashboard");
  const data = useDashboardData();
  const columns: LedgerColumn[] = [
    { key: "content", label: t("dashboard.columns.content") ?? "Content", width: "340px" },
    { key: "asset", label: t("dashboard.columns.assetType") ?? "Asset type", width: "180px" },
    { key: "owner", label: t("dashboard.columns.owner") ?? "Owner", width: "180px" },
    { key: "evidence", label: t("dashboard.columns.evidence") ?? "Evidence", width: "220px" }
  ];

  return (
    <div className="flex max-h-[24rem] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/80">
      <div className="border-b border-cyan-200 dark:border-cyan-400/20 bg-white dark:bg-slate-900/90 px-5 py-4">
        <div className="inline-flex rounded-lg border border-cyan-200 dark:border-cyan-400/20 bg-cyan-50 dark:bg-cyan-400/10 px-3 py-1.5">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{t("dashboard.sections.assetsTitle") ?? "Creative assets / assets"}</div>
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t("dashboard.sections.assetsDescription") ??
            "Research, visual, and caption assets stay in a single horizontal ledger before QA_ready."}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <LedgerShell
          columns={columns}
          rows={data.assets}
          minWidth="920px"
          renderRow={(asset: Phase2DashboardData["assets"][number]) => {
            const content = data.contentItems.find((row) => row.id === asset.contentItemId);
            return [
              <>
                <div className="font-medium text-slate-900 dark:text-white">{content?.title ?? (t("dashboard.labels.pending") ?? "pending")}</div>
                <div className="text-xs text-slate-500">{content ? (t(`dashboard.state.${content.currentState}`) ?? content.currentState) : (t("dashboard.labels.pending") ?? "pending")}</div>
              </>,
              <StateBadge label={asset.assetType} displayLabel={t(`dashboard.assetType.${asset.assetType}`) ?? asset.assetType} />,
              asset.ownerRef,
              <span className="text-xs text-slate-500 dark:text-slate-400">{asset.evidenceRef ?? (t("dashboard.labels.pending") ?? "pending")}</span>
            ];
          }}
        />
      </div>
    </div>
  );
}

function QAView() {
  const { t } = useI18n("dashboard");
  const data = useDashboardData();
  const columns: LedgerColumn[] = [
    { key: "content", label: t("dashboard.columns.content") ?? "Content", width: "280px" },
    { key: "score", label: t("dashboard.columns.score") ?? "Score", width: "110px" },
    { key: "risk", label: t("dashboard.columns.risk") ?? "Risk", width: "110px" },
    { key: "missing", label: t("dashboard.columns.missingAsset") ?? "Missing asset", width: "140px" },
    { key: "verdict", label: t("dashboard.columns.verdict") ?? "Verdict", width: "140px" },
    { key: "evidence", label: t("dashboard.columns.evidence") ?? "Evidence", width: "220px" },
    { key: "publish", label: t("dashboard.columns.publish") ?? "Publish", width: "140px" }
  ];

  return (
    <div className="flex max-h-[24rem] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/80">
      <div className="border-b border-cyan-200 dark:border-cyan-400/20 bg-white dark:bg-slate-900/90 px-5 py-4">
        <div className="inline-flex rounded-lg border border-cyan-200 dark:border-cyan-400/20 bg-cyan-50 dark:bg-cyan-400/10 px-3 py-1.5">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{t("dashboard.sections.qaTitle") ?? "QA gate / qa_reviews"}</div>
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t("dashboard.sections.qaDescription") ??
            "Reviews are read as approval gates, with risk and publish eligibility visible at a glance."}
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <LedgerShell
          columns={columns}
          rows={data.contentItems}
          minWidth="1080px"
          renderRow={(content: Phase2DashboardData["contentItems"][number]) => {
            const review = getPhase2LatestReview(content.id, data.qaReviews);
            const publish = getPhase2PublishEligibility(content.id, data.qaReviews, data.assets);
            return [
              <>
                <div className="font-medium text-slate-900 dark:text-white">{content.title}</div>
                <div className="text-xs text-slate-500">{t(`dashboard.state.${content.currentState}`) ?? content.currentState}</div>
              </>,
              review ? review.averageScore.toFixed(1) : (t("dashboard.labels.pending") ?? "pending"),
              review ? review.overclaimRisk : (t("dashboard.labels.pending") ?? "pending"),
              review ? (review.missingAsset ? (t("dashboard.boolean.yes") ?? "Yes") : (t("dashboard.boolean.no") ?? "No")) : (t("dashboard.labels.pending") ?? "pending"),
              <StateBadge label={review ? review.verdict : (t("dashboard.labels.pending") ?? "pending")} displayLabel={review ? (t(`dashboard.verdict.${review.verdict}`) ?? review.verdict) : (t("dashboard.labels.pending") ?? "pending")} />,
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

function PerformanceView() {
  const { t } = useI18n("dashboard");
  const data = useDashboardData();
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

  return (
    <div className="flex max-h-[24rem] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/80">
      <div className="border-b border-cyan-200 dark:border-cyan-400/20 bg-white dark:bg-slate-900/90 px-5 py-4">
        <div className="inline-flex rounded-lg border border-cyan-200 dark:border-cyan-400/20 bg-cyan-50 dark:bg-cyan-400/10 px-3 py-1.5">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{t("dashboard.sections.performanceTitle") ?? "Performance ledger / performance_records"}</div>
        </div>
        <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t("dashboard.sections.performanceDescription") ??
            "Post-publish snapshots only. Missing metrics render as pending / incomplete."}
        </div>
      </div>
      <div className="mb-6 mt-4 min-h-0">
        <PerformanceChart data={aggregatePerformanceData(data.performanceRecords)} />
      </div>
      <div className="min-h-0 flex-1">
        <LedgerShell
          columns={columns}
          rows={data.performanceRecords}
          minWidth="1680px"
          bodyMaxHeight="max-h-[14rem]"
          renderRow={(record: Phase2DashboardData["performanceRecords"][number]) => {
            const content = data.contentItems.find((row) => row.id === record.contentItemId);
            return [
              <>
                <div className="font-medium text-slate-900 dark:text-white">{content?.title ?? (t("dashboard.labels.pending") ?? "pending")}</div>
                <div className="text-xs text-slate-500">{content?.currentState ?? (t("dashboard.labels.pending") ?? "pending")}</div>
              </>,
              record.ownerRef,
              ...PHASE2_PERFORMANCE_METRIC_FIELDS.map((metric) => {
                const value = record[metric];
                return (
                  <span className="text-slate-900 dark:text-white">
                    {typeof value === "number" ? value : (t("dashboard.labels.pendingIncomplete") ?? "pending / incomplete")}
                  </span>
                );
              }),
              <span className="text-xs text-slate-500 dark:text-slate-400">{record.sourceRef}</span>,
              <span className="text-xs text-slate-500 dark:text-slate-400">{record.capturedAt}</span>
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
}: {
  data: Phase2DashboardData;
  loadState: "loading" | "ready" | "blocked";
  loadReason?: string;
}) {
  const { t } = useI18n("dashboard");
  const [activeTab, setActiveTab] = useState<DashboardTab>("pipeline");

  const publishedCount = data.contentItems.filter((item) => item.currentState === "published").length;
  const eligibleCount = data.contentItems.filter((item) => getPhase2PublishEligibility(item.id, data.qaReviews, data.assets).ready).length;
  const qaReadyCount = data.contentItems.filter((item) => item.currentState === "QA_ready").length;

  const summaryCards: SummaryCard[] = [
    {
      label: t("dashboard.metrics.contentItems.label") ?? "Content items",
      value: data.contentItems.length,
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

  if (loadState === "blocked") {
    return (
      <PageFrame
        className="flex min-h-full min-w-0 flex-col overflow-hidden"
        contentClassName="flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-hidden pr-1"
        title={t("dashboard.page.title") ?? "Dashboard"}
        purpose={
          t("dashboard.page.purpose") ??
          "Canonical Phase 2 content pipeline dashboard for content_items, agent_tasks, assets, qa_reviews, and performance_records."
        }
        statusLabel={t("dashboard.page.statusLabel") ?? "Phase 2 canonical pipeline"}
        statusValue="BLOCKED"
        allowedActions={[]}
        forbiddenActions={[]}
      >
        <div className="rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-5 text-rose-600 dark:text-rose-200">
          <h2 className="text-lg font-semibold">Failed to load Phase 2 Data</h2>
          <p className="mt-2 text-sm">{loadReason}</p>
        </div>
      </PageFrame>
    );
  }

  return (
    <DashboardDataContext.Provider value={data}>
      <PageFrame
      className="flex min-h-full min-w-0 flex-col overflow-hidden"
      contentClassName="flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-hidden pr-1"
      title={t("dashboard.page.title") ?? "Bảng điều khiển"}
      purpose={
        t("dashboard.page.purpose") ??
        "Bảng điều khiển pipeline Phase 2 cho content_items, agent_tasks, assets, qa_reviews, và performance_records."
      }
      statusLabel={t("dashboard.page.statusLabel") ?? "Phase 2 pipeline"}
      statusValue="QA_ready"
      statusDisplayValue={t("dashboard.state.QA_ready") ?? "Sẵn sàng QA"}
      allowedActions={[
        t("dashboard.page.allowed.inspectPipeline") ?? "Xem pipeline",
        t("dashboard.page.allowed.reviewOwnership") ?? "Xem quyền sở hữu task",
        t("dashboard.page.allowed.checkEligibility") ?? "Kiểm tra điều kiện xuất bản"
      ]}
      forbiddenActions={[
        t("dashboard.page.forbidden.autoPublish") ?? "Tự động xuất bản",
        t("dashboard.page.forbidden.autoApprove") ?? "Tự động phê duyệt",
        t("dashboard.page.forbidden.bypassQa") ?? "Bỏ qua QA"
      ]}
    >
      <CampaignControlBar activeTab={activeTab} onTabChange={setActiveTab} />
      <SummaryGrid cards={summaryCards} />

      {activeTab === "pipeline" && (
        <SectionFrame
          className="flex min-h-0 min-w-0 flex-col"
          bodyClassName="min-h-0 min-w-0 flex-1 overflow-hidden"
          title={t("dashboard.sections.pipelineBoard") ?? "Pipeline board (content_items)"}
          description={t("dashboard.sections.pipelineBoardDescription") ?? "idea → research_ready → visual_ready → caption_ready → QA_ready → QA_passed → scheduled → published"}
        >
          <PipelineBoard />
        </SectionFrame>
      )}

      {activeTab === "tasks" && <TaskView />}
      {activeTab === "assets" && <AssetView />}
      {activeTab === "qa" && <QAView />}
      {activeTab === "performance" && <PerformanceView />}
    </PageFrame>
    </DashboardDataContext.Provider>
  );
}
