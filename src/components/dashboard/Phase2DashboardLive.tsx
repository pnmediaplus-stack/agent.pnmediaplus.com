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
  key: string;
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
      className={`overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-700 bg-gradient-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950/80 shadow-sm shadow-md hover:shadow-lg transition-shadow duration-300 ${className ?? ""}`}
    >
      <div className="border-b border-cyan-200 dark:border-cyan-400/20 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-4">
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
      <div className="overflow-hidden rounded-2xl border border-slate-200/60 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </span>
                <div className="text-sm font-bold text-slate-800 dark:text-white">
                  {t("dashboard.controls.title") ?? "Locked campaign workspace"}
                </div>
              </div>
              <div className="mt-1.5 max-w-3xl text-[13px] leading-5 text-slate-500 dark:text-slate-400">
                {t("dashboard.controls.description") ??
                  "Vertical dashboard shell. No page-level horizontal mode. Wide content stays inside internal rails, tables, and snapshots."}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-1.5 bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50">
                {tabs.map((tab, index) => (
                  <span
                    key={tab}
                    className={[
                      "inline-flex items-center rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] transition-colors",
                      index === 0
                        ? "bg-white dark:bg-slate-700 text-cyan-700 dark:text-cyan-300 shadow-sm border border-slate-200/50 dark:border-slate-600"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    ].join(" ")}
                  >
                    {tab}
                  </span>
                ))}
              </div>
              <div className="hidden lg:block h-8 w-px bg-slate-200 dark:bg-slate-700"></div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-bold uppercase tracking-[0.06em] text-white shadow-sm hover:bg-cyan-500 transition-colors"
              >
                <span>+</span> {t("dashboard.controls.createIdea") ?? "Create Idea"}
              </button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 bg-white dark:bg-slate-900">
          <span className="rounded-md bg-cyan-50 dark:bg-cyan-900/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-cyan-700 dark:text-cyan-300 border border-cyan-100 dark:border-cyan-800">
            {t("dashboard.controls.fixedSidebar") ?? "Fixed sidebar"}
          </span>
          <span className="rounded-md bg-slate-50 dark:bg-slate-800/50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
            {t("dashboard.controls.internalHorizontalScrollOnly") ?? "Internal horizontal scroll only"}
          </span>
          <span className="rounded-md bg-emerald-50 dark:bg-emerald-900/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-800">
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

function getSummaryCardTheme(card: SummaryCard) {
  switch (card.key) {
    case "content_items":
      return {
        card: "bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200/80 dark:border-indigo-800/60",
        header: "border-b border-indigo-200/80 dark:border-indigo-800/60 bg-indigo-100/70 dark:bg-indigo-900/40",
        title: "text-indigo-900 dark:text-indigo-200 font-extrabold",
        value: "text-indigo-950 dark:text-white"
      };
    case "qa_ready":
      return {
        card: "bg-cyan-50/70 dark:bg-cyan-950/30 border-cyan-200/80 dark:border-cyan-800/60",
        header: "border-b border-cyan-200/80 dark:border-cyan-800/60 bg-cyan-100/70 dark:bg-cyan-900/40",
        title: "text-cyan-900 dark:text-cyan-200 font-extrabold",
        value: "text-cyan-950 dark:text-white"
      };
    case "publish_eligible":
      return {
        card: "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/60",
        header: "border-b border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-100/70 dark:bg-emerald-900/40",
        title: "text-emerald-900 dark:text-emerald-200 font-extrabold",
        value: "text-emerald-950 dark:text-white"
      };
    case "published":
    default:
      return {
        card: "bg-purple-50/70 dark:bg-purple-950/30 border-purple-200/80 dark:border-purple-800/60",
        header: "border-b border-purple-200/80 dark:border-purple-800/60 bg-purple-100/70 dark:bg-purple-900/40",
        title: "text-purple-900 dark:text-purple-200 font-extrabold",
        value: "text-purple-950 dark:text-white"
      };
  }
}

function SummaryGrid({ cards }: { cards: SummaryCard[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const theme = getSummaryCardTheme(card);
        return (
          <div key={card.key} className={`min-w-0 overflow-hidden rounded-2xl border shadow-sm transition-all ${theme.card}`}>
            <div className={`px-4 py-3 ${theme.header}`}>
              <div className={`text-xs uppercase tracking-wider ${theme.title}`}>{card.label}</div>
            </div>
            <div className="p-4">
              <div className={`text-3xl font-extrabold ${theme.value}`}>{card.value}</div>
              <div className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400 font-medium">{card.note}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getStageCardTheme(state: string) {
  switch (state) {
    case "idea":
      return {
        card: "bg-slate-100/90 dark:bg-slate-900/90 border-slate-300/80 dark:border-slate-700/80 border-l-4 border-l-slate-400 dark:border-l-slate-500 shadow-sm hover:shadow-md",
        inner: "bg-white/90 dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700/60 shadow-2xs"
      };
    case "research_ready":
      return {
        card: "bg-cyan-50/80 dark:bg-cyan-950/40 border-cyan-200/90 dark:border-cyan-800/60 border-l-4 border-l-cyan-500 dark:border-l-cyan-400 shadow-sm hover:shadow-md",
        inner: "bg-white/90 dark:bg-slate-900/80 border-cyan-100 dark:border-cyan-900/50 shadow-2xs"
      };
    case "visual_ready":
      return {
        card: "bg-purple-50/80 dark:bg-purple-950/40 border-purple-200/90 dark:border-purple-800/60 border-l-4 border-l-purple-500 dark:border-l-purple-400 shadow-sm hover:shadow-md",
        inner: "bg-white/90 dark:bg-slate-900/80 border-purple-100 dark:border-purple-900/50 shadow-2xs"
      };
    case "caption_ready":
      return {
        card: "bg-amber-50/80 dark:bg-amber-950/40 border-amber-200/90 dark:border-amber-800/60 border-l-4 border-l-amber-500 dark:border-l-amber-400 shadow-sm hover:shadow-md",
        inner: "bg-white/90 dark:bg-slate-900/80 border-amber-100 dark:border-amber-900/50 shadow-2xs"
      };
    case "QA_ready":
      return {
        card: "bg-blue-50/80 dark:bg-blue-950/40 border-blue-200/90 dark:border-blue-800/60 border-l-4 border-l-blue-500 dark:border-l-blue-400 shadow-sm hover:shadow-md",
        inner: "bg-white/90 dark:bg-slate-900/80 border-blue-100 dark:border-blue-900/50 shadow-2xs"
      };
    case "QA_passed":
      return {
        card: "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200/90 dark:border-emerald-800/60 border-l-4 border-l-emerald-500 dark:border-l-emerald-400 shadow-sm hover:shadow-md",
        inner: "bg-white/90 dark:bg-slate-900/80 border-emerald-100 dark:border-emerald-900/50 shadow-2xs"
      };
    case "scheduled":
      return {
        card: "bg-sky-50/80 dark:bg-sky-950/40 border-sky-200/90 dark:border-sky-800/60 border-l-4 border-l-sky-500 dark:border-l-sky-400 shadow-sm hover:shadow-md",
        inner: "bg-white/90 dark:bg-slate-900/80 border-sky-100 dark:border-sky-900/50 shadow-2xs"
      };
    case "published":
      return {
        card: "bg-teal-50/80 dark:bg-teal-950/40 border-teal-200/90 dark:border-teal-800/60 border-l-4 border-l-teal-500 dark:border-l-teal-400 shadow-sm hover:shadow-md",
        inner: "bg-white/90 dark:bg-slate-900/80 border-teal-100 dark:border-teal-900/50 shadow-2xs"
      };
    default:
      return {
        card: "bg-slate-50/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-700/80 border-l-4 border-l-slate-400 shadow-sm hover:shadow-md",
        inner: "bg-white/90 dark:bg-slate-800/70 border-slate-200/80 dark:border-slate-700/60 shadow-2xs"
      };
  }
}

function cleanSystemText(text?: string | null): string {
  if (!text) return "";
  return text.replace(/--[\w-]+=[^\s]+\s*/g, "").replace(/--[\w-]+\s*/g, "").trim();
}

function cleanOwnerRef(ownerRef?: string | null, fallback = "AI Agent"): string {
  if (!ownerRef) return fallback;
  const trimmed = ownerRef.trim();
  if (trimmed.includes('@')) {
    return trimmed.split('@')[0];
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return fallback;
  }
  return trimmed;
}

function extractActionBadge(rawText?: string | null, t?: (key: string) => string | undefined): { label: string; bg: string } | null {
  if (!rawText) return null;
  if (rawText.includes('--image-action=use_provided')) {
    return { label: t?.("dashboard.action.useProvidedImage") ?? "🖼️ Ảnh có sẵn", bg: 'bg-blue-100/90 dark:bg-blue-950/70 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800/60' };
  }
  if (rawText.includes('--image-action=generate_new')) {
    return { label: t?.("dashboard.action.generateNewImage") ?? "🎨 AI Tạo ảnh mới", bg: 'bg-purple-100/90 dark:bg-purple-950/70 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800/60' };
  }
  if (rawText.includes('--video-action')) {
    return { label: t?.("dashboard.action.video") ?? "🎥 Dựng Video", bg: 'bg-amber-100/90 dark:bg-amber-950/70 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800/60' };
  }
  return null;
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

  const theme = getStageCardTheme(item.currentState);

  const actionBadge = extractActionBadge(item.title, t) || extractActionBadge(item.brief, t);
  const cleanTitleStr = cleanSystemText(item.title);
  let cleanBriefStr = cleanSystemText(item.brief);

  if (
    !cleanBriefStr ||
    cleanBriefStr === cleanTitleStr ||
    cleanTitleStr.startsWith(cleanBriefStr) ||
    cleanBriefStr.startsWith(cleanTitleStr)
  ) {
    cleanBriefStr = "";
  }

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

  const assetCompletionText = `${requiredAssets.present.length}/${requiredAssets.totalRequired}`;
  const qaGateText = review
    ? (t(`dashboard.verdict.${review.verdict}`) ?? review.verdict)
    : (t("dashboard.labels.pendingUpper") ?? "PENDING");
  const riskIsHigh = review ? (review.overclaimRisk > 3 || review.averageScore < 7) : false;
  const displayOwner = cleanOwnerRef(item.ownerRef, t("dashboard.labels.aiAgent") ?? "AI Agent");

  return (
    <div
      className={`flex h-[29.5rem] min-h-[29.5rem] w-full max-w-[22rem] sm:w-[22rem] flex-none flex-col overflow-hidden rounded-xl border hover:-translate-y-0.5 transition-all duration-300 ${theme.card}`}
    >
      {/* Header */}
      <div className="px-4 pt-3.5 pb-2.5 flex-none h-[5.5rem] border-b border-slate-200/40 dark:border-slate-800/40 flex flex-col justify-between">
        <div className="flex items-center justify-between gap-2">
          <StateBadge label={item.currentState} displayLabel={t(`dashboard.state.${item.currentState}`) ?? item.currentState} />
          {actionBadge && (
            <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border shadow-2xs shrink-0 ${actionBadge.bg}`}>
              {actionBadge.label}
            </span>
          )}
        </div>

        <div className="min-w-0">
          <div className="break-words whitespace-normal text-sm font-extrabold leading-tight text-slate-900 dark:text-white line-clamp-2">
            {cleanTitleStr || item.title}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 flex flex-col justify-between space-y-3 custom-scrollbar-thin">
        <div>
          {cleanBriefStr ? (
            <div className="mb-3 max-h-12 overflow-hidden break-words whitespace-normal text-[12px] leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-2 italic border-l-2 border-slate-300 dark:border-slate-700 pl-2">
              {cleanBriefStr}
            </div>
          ) : null}

          {/* 4 Distinct Sub-Cards Grid (Synchronized Height) */}
          <div className="grid grid-cols-2 gap-2.5 mb-3 h-[6.75rem] flex-none">
            {/* Sub-Card 1: Owner */}
            <div className={`rounded-xl p-2.5 border transition-all flex flex-col justify-between ${theme.inner}`}>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
                <span>{t("dashboard.labels.cardOwner") ?? "Owner"}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
              </div>
              <div className="text-xs font-bold text-indigo-900 dark:text-indigo-200 truncate" title={item.ownerRef}>
                {displayOwner}
              </div>
            </div>

            {/* Sub-Card 2: Next Phase */}
            <div className={`rounded-xl p-2.5 border transition-all flex flex-col justify-between ${theme.inner}`}>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
                <span>{t("dashboard.labels.nextPhase") ?? "Next Phase"}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
              </div>
              <div className="text-xs font-bold text-cyan-900 dark:text-cyan-200 truncate">
                {t(`dashboard.state.${nextState}`) ?? nextState}
              </div>
            </div>

            {/* Sub-Card 3: Assets Progress */}
            <div className={`rounded-xl p-2.5 border transition-all flex flex-col justify-between ${theme.inner}`}>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
                <span>{t("dashboard.labels.assetsCount") ?? "Assets"}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${requiredAssets.present.length === requiredAssets.totalRequired ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              </div>
              <div className={`text-xs font-bold ${requiredAssets.present.length === requiredAssets.totalRequired ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                {assetCompletionText} <span className="text-[10px] font-normal opacity-80">{t("dashboard.labels.readyCount") ?? "ready"}</span>
              </div>
            </div>

            {/* Sub-Card 4: QA Status */}
            <div className={`rounded-xl p-2.5 border transition-all flex flex-col justify-between ${theme.inner}`}>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 flex items-center justify-between">
                <span>{t("dashboard.labels.qaStatus") ?? "QA Status"}</span>
                <span className={`w-1.5 h-1.5 rounded-full ${review ? (riskIsHigh ? 'bg-rose-500' : 'bg-emerald-500') : 'bg-slate-400'}`}></span>
              </div>
              <div className={`text-xs font-bold truncate ${review ? (riskIsHigh ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300') : 'text-slate-600 dark:text-slate-400'}`}>
                {qaGateText}
              </div>
            </div>
          </div>

          {/* Required Assets Sub-cards */}
          <div className="space-y-1.5 min-h-[3.5rem] flex flex-col justify-start">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t("dashboard.labels.requiredAssets") ?? "Required Assets"}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {requiredAssets.present.map((assetType) => (
                <span key={assetType} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/60 shadow-2xs">
                  <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {t(`dashboard.assetType.${assetType}`) ?? assetType}
                </span>
              ))}
              {requiredAssets.missing.map((assetType) => (
                <span key={assetType} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 text-[11px] font-semibold text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 shadow-2xs">
                  <svg className="w-3 h-3 text-rose-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t(`dashboard.assetType.${assetType}`) ?? assetType}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-auto pt-2 border-t border-slate-200/40 dark:border-slate-800/40 flex-none">
          {item.currentState === 'QA_passed' && (
            <div>
              <button
                onClick={handlePublish}
                disabled={isPublishing || !publish.ready}
                aria-label={isPublishing ? (t("dashboard.labels.publishing") ?? "Publishing...") : (t("dashboard.labels.approvePublish") ?? "Approve & Publish")}
                className={`w-full rounded-lg px-4 py-2 text-xs font-bold text-white shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-blue-400 ${
                  isPublishing || !publish.ready
                    ? "cursor-not-allowed bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500"
                    : "bg-blue-600 hover:bg-blue-500 hover:shadow"
                }`}
              >
                {isPublishing ? (t("dashboard.labels.publishing") ?? "Publishing...") : (t("dashboard.labels.approvePublish") ?? "Approve & Publish")}
              </button>
              {!publish.ready && (
                <p className="mt-1 text-center text-[10px] text-rose-500 font-medium">
                  {t("dashboard.labels.notEligible") ?? "Not eligible for publish"}
                </p>
              )}
            </div>
          )}

          {item.currentState === 'published' && performanceRecords && performanceRecords.some(p => p.contentItemId === item.id) && (
            <div className="grid grid-cols-3 gap-1.5 text-center">
              {performanceRecords.filter(p => p.contentItemId === item.id).slice(0, 1).map((perf, idx) => (
                <React.Fragment key={idx}>
                  <div className={`rounded-lg p-1.5 border ${theme.inner}`}>
                    <div className="text-[9px] font-bold text-slate-400 uppercase">{t("dashboard.performanceMetric.views") ?? "Views"}</div>
                    <div className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">{perf.views?.toLocaleString() || 0}</div>
                  </div>
                  <div className={`rounded-lg p-1.5 border ${theme.inner}`}>
                    <div className="text-[9px] font-bold text-slate-400 uppercase">{t("dashboard.performanceMetric.likes") ?? "Likes"}</div>
                    <div className="text-xs font-extrabold text-rose-600 dark:text-rose-400 mt-0.5">{perf.likes?.toLocaleString() || 0}</div>
                  </div>
                  <div className={`rounded-lg p-1.5 border ${theme.inner}`}>
                    <div className="text-[9px] font-bold text-slate-400 uppercase">{t("dashboard.performanceMetric.CTR") ?? "CTR"}</div>
                    <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{perf.CTR ? perf.CTR.toFixed(2) + '%' : '0%'}</div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}
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
          <thead className="text-[10px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-3 font-bold">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
        </table>
        <div className={`${bodyMaxHeight} overflow-y-auto overflow-x-hidden custom-scrollbar`}>
          <table className="w-full table-fixed border-separate border-spacing-0 text-left text-sm">
            <colgroup>
              {columns.map((column) => (
                <col key={column.key} style={{ width: column.width }} />
              ))}
            </colgroup>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {rows.map((row, index) => (
                <tr key={index} className="group text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/30">
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
      <div className="rounded-2xl border border-blue-100 dark:border-blue-900/50 bg-gradient-to-b from-blue-50/50 to-white dark:from-blue-950/20 dark:to-slate-900 shadow-sm p-5">
        <div className="inline-flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-100/50 dark:bg-blue-900/30 px-3 py-1.5">
          <div className="text-sm font-bold tracking-tight text-blue-800 dark:text-blue-300">
            {t("dashboard.sections.taskLedgerTitle") ?? "Task ledger / agent_tasks"}
          </div>
        </div>
        <div className="mt-1 text-[13px] leading-5 text-slate-500 dark:text-slate-400">
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
    <div className="flex max-h-[24rem] min-h-0 flex-col overflow-hidden rounded-2xl border border-blue-100 dark:border-blue-900/50 bg-white dark:bg-slate-900 shadow-sm">
      <div className="border-b border-blue-100 dark:border-blue-900/50 bg-gradient-to-r from-blue-50/50 to-white dark:from-blue-950/30 dark:to-slate-900 px-5 py-4">
        <div className="inline-flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-100/50 dark:bg-blue-900/30 px-3 py-1.5">
          <div className="text-sm font-bold tracking-tight text-blue-800 dark:text-blue-300">
            {t("dashboard.sections.taskLedgerTitle") ?? "Task ledger / agent_tasks"}
          </div>
        </div>
        <div className="mt-1 text-[13px] leading-5 text-slate-500 dark:text-slate-400">
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
            const cleanContentTitle = cleanSystemText(content?.title);
            const cleanOwner = currentTask.ownerRef ? currentTask.ownerRef.split('@')[0].split('-')[0] : "AI Agent";
            return [
              <>
                <div className="font-semibold text-slate-900 dark:text-white">{cleanContentTitle || (t("dashboard.labels.pending") ?? "Chờ xử lý")}</div>
                <div className="text-xs text-slate-500">{content ? (t(`dashboard.state.${content.currentState}`) ?? content.currentState) : "Chờ xử lý"}</div>
              </>,
              t(`dashboard.taskKind.${currentTask.taskKind}`) ?? currentTask.taskKind,
              cleanOwner,
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
      <div className="rounded-2xl border border-violet-100 dark:border-violet-900/50 bg-gradient-to-b from-violet-50/50 to-white dark:from-violet-950/20 dark:to-slate-900 shadow-sm p-5">
        <div className="inline-flex items-center gap-2 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-100/50 dark:bg-violet-900/30 px-3 py-1.5">
          <div className="text-sm font-bold tracking-tight text-violet-800 dark:text-violet-300">
            {t("dashboard.sections.assetsTitle") ?? "Creative assets / assets"}
          </div>
        </div>
        <div className="mt-1 text-[13px] leading-5 text-slate-500 dark:text-slate-400">
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
    <div className="flex max-h-[24rem] min-h-0 flex-col overflow-hidden rounded-2xl border border-violet-100 dark:border-violet-900/50 bg-white dark:bg-slate-900 shadow-sm">
      <div className="border-b border-violet-100 dark:border-violet-900/50 bg-gradient-to-r from-violet-50/50 to-white dark:from-violet-950/30 dark:to-slate-900 px-5 py-4">
        <div className="inline-flex items-center gap-2 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-100/50 dark:bg-violet-900/30 px-3 py-1.5">
          <div className="text-sm font-bold tracking-tight text-violet-800 dark:text-violet-300">
            {t("dashboard.sections.assetsTitle") ?? "Creative assets / assets"}
          </div>
        </div>
        <div className="mt-1 text-[13px] leading-5 text-slate-500 dark:text-slate-400">
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
            const cleanContentTitle = cleanSystemText(content?.title);
            const cleanOwner = currentAsset.ownerRef ? currentAsset.ownerRef.split('@')[0].split('-')[0] : "System";
            return [
              <>
                <div className="font-semibold text-slate-900 dark:text-white">{cleanContentTitle || (t("dashboard.labels.pending") ?? "Chờ xử lý")}</div>
                <div className="text-xs text-slate-500">
                  {content ? (t(`dashboard.state.${content.currentState}`) ?? content.currentState) : (t("dashboard.labels.pending") ?? "Chờ xử lý")}
                </div>
              </>,
              <StateBadge label={currentAsset.assetType} displayLabel={t(`dashboard.assetType.${currentAsset.assetType}`) ?? currentAsset.assetType} />,
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {cleanOwner}
              </span>,
              <div className="max-w-[300px] overflow-hidden text-ellipsis whitespace-nowrap text-xs text-slate-600 dark:text-slate-300" title={currentAsset.assetUri}>
                {currentAsset.assetUri && currentAsset.assetUri.startsWith('http') ? (
                  <a href={currentAsset.assetUri} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400 font-semibold hover:underline">
                    🔗 Xem tài nguyên
                  </a>
                ) : (
                  currentAsset.assetUri ? cleanSystemText(currentAsset.assetUri) : (t("dashboard.labels.pending") ?? "Chờ xử lý")
                )}
              </div>
            ];
          }}
        />
      </div>
    </div>
  );
}

function getEvidenceBadge(evidenceStr?: string, reviewVerdict?: string, t?: (key: string) => string | undefined) {
  if (!evidenceStr || !evidenceStr.trim()) {
    return (
      <span className="text-xs text-slate-400">
        {t?.("dashboard.labels.systemPending") ?? "Chờ đối soát"}
      </span>
    );
  }

  const trimmed = evidenceStr.trim();
  let isVerified = false;

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object') {
        if (parsed.verdict === 'pass' || parsed.status === 'verified' || (parsed.missingAsset === false && parsed.averageScore >= 7)) {
          isVerified = true;
        }
      }
    } catch (e) {
      // Not valid JSON
    }
  } else if (reviewVerdict === 'pass' || reviewVerdict === 'pass_with_conditions') {
    isVerified = true;
  }

  if (isVerified) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
        ✓ {t?.("dashboard.labels.systemVerified") ?? "Đã đối soát hệ thống"}
      </span>
    );
  }

  return (
    <span className="text-xs text-slate-600 dark:text-slate-300">
      {cleanSystemText(evidenceStr)}
    </span>
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
    { key: "content", label: t("dashboard.columns.content") ?? "Content", width: "340px" },
    { key: "score", label: t("dashboard.columns.score") ?? "Score", width: "120px" },
    { key: "risk", label: t("dashboard.columns.risk") ?? "Risk", width: "120px" },
    { key: "missingAssets", label: t("dashboard.columns.missingAssets") ?? "Missing assets", width: "220px" },
    { key: "verdict", label: t("dashboard.columns.verdict") ?? "Verdict", width: "160px" },
    { key: "evidence", label: t("dashboard.columns.evidence") ?? "Evidence", width: "200px" },
    { key: "publish", label: t("dashboard.columns.publish") ?? "Publish", width: "160px" }
  ];

  if (!contentItems.length) {
    return (
      <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/50 bg-gradient-to-b from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-slate-900 shadow-sm p-5">
        <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-100/50 dark:bg-emerald-900/30 px-3 py-1.5">
          <div className="text-sm font-bold tracking-tight text-emerald-800 dark:text-emerald-300">
            {t("dashboard.sections.qaTitle") ?? "QA gate / qa_reviews"}
          </div>
        </div>
        <div className="mt-1 text-[13px] leading-5 text-slate-500 dark:text-slate-400">
          {t("dashboard.sections.qaDescription") ?? "Evaluated as an approval gate, showing risk and publish eligibility."}
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
    <div className="flex max-h-[24rem] min-h-0 flex-col overflow-hidden rounded-2xl border border-emerald-100 dark:border-emerald-900/50 bg-white dark:bg-slate-900 shadow-sm">
      <div className="border-b border-emerald-100 dark:border-emerald-900/50 bg-gradient-to-r from-emerald-50/50 to-white dark:from-emerald-950/30 dark:to-slate-900 px-5 py-4">
        <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-100/50 dark:bg-emerald-900/30 px-3 py-1.5">
          <div className="text-sm font-bold tracking-tight text-emerald-800 dark:text-emerald-300">
            {t("dashboard.sections.qaTitle") ?? "QA gate / qa_reviews"}
          </div>
        </div>
        <div className="mt-1 text-[13px] leading-5 text-slate-500 dark:text-slate-400">
          {t("dashboard.sections.qaDescription") ?? "Evaluated as an approval gate, showing risk and publish eligibility."}
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
            const cleanContentTitle = cleanSystemText(currentContent.title);

            return [
              <>
                <div className="font-semibold text-slate-900 dark:text-white">{cleanContentTitle || currentContent.title}</div>
                <div className="text-xs text-slate-500">{t(`dashboard.state.${currentContent.currentState}`) ?? currentContent.currentState}</div>
              </>,
              review ? review.averageScore.toFixed(1) : (t("dashboard.labels.pending") ?? "Chờ duyệt"),
              review ? review.overclaimRisk : (t("dashboard.labels.pending") ?? "Chờ duyệt"),
              review
                ? review.missingAsset
                  ? (t("dashboard.boolean.yes") ?? "Có")
                  : (t("dashboard.boolean.no") ?? "Không")
                : (t("dashboard.labels.pending") ?? "Chờ duyệt"),
              <StateBadge
                label={review ? review.verdict : (t("dashboard.labels.pending") ?? "pending")}
                displayLabel={review ? (t(`dashboard.verdict.${review.verdict}`) ?? review.verdict) : (t("dashboard.labels.pending") ?? "Chờ duyệt")}
              />,
              <div className="text-xs text-slate-600 dark:text-slate-300 break-all max-w-[200px] max-h-20 overflow-y-auto">
                {getEvidenceBadge(review?.evidenceRef, review?.verdict, t)}
              </div>,
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
    { key: "content", label: t("dashboard.columns.content") ?? "Content", width: "340px" },
    { key: "platform", label: t("dashboard.columns.platform") ?? "Platform", width: "160px" },
    { key: "views", label: t("dashboard.columns.views") ?? "Views", width: "140px" },
    { key: "engagements", label: t("dashboard.columns.engagements") ?? "Engagements", width: "140px" },
    { key: "ctr", label: t("dashboard.columns.ctr") ?? "CTR", width: "140px" },
    { key: "cost", label: t("dashboard.columns.cost") ?? "Cost", width: "140px" },
    { key: "cpc", label: t("dashboard.columns.cpc") ?? "CPC", width: "140px" }
  ];

  if (!records.length) {
    return (
      <div className="rounded-2xl border border-amber-100 dark:border-amber-900/50 bg-gradient-to-b from-amber-50/50 to-white dark:from-amber-950/20 dark:to-slate-900 shadow-sm p-5">
        <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-100/50 dark:bg-amber-900/30 px-3 py-1.5">
          <div className="text-sm font-bold tracking-tight text-amber-800 dark:text-amber-300">
            {t("dashboard.sections.performanceTitle") ?? "Performance ledger / performance_records"}
          </div>
        </div>
        <div className="mt-1 text-[13px] leading-5 text-slate-500 dark:text-slate-400">
          {t("dashboard.sections.performanceDescription") ?? "Only snapshots after publish. Missing metrics stay pending / incomplete."}
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
    <div className="flex max-h-[24rem] min-h-0 flex-col overflow-hidden rounded-2xl border border-amber-100 dark:border-amber-900/50 bg-white dark:bg-slate-900 shadow-sm">
      <div className="border-b border-amber-100 dark:border-amber-900/50 bg-gradient-to-r from-amber-50/50 to-white dark:from-amber-950/30 dark:to-slate-900 px-5 py-4">
        <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-100/50 dark:bg-amber-900/30 px-3 py-1.5">
          <div className="text-sm font-bold tracking-tight text-amber-800 dark:text-amber-300">
            {t("dashboard.sections.performanceTitle") ?? "Performance ledger / performance_records"}
          </div>
        </div>
        <div className="mt-1 text-[13px] leading-5 text-slate-500 dark:text-slate-400">
          {t("dashboard.sections.performanceDescription") ?? "Only snapshots after publish. Missing metrics stay pending / incomplete."}
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
      key: "content_items",
      label: t("dashboard.metrics.contentItems.label") ?? "Content items",
      value: liveData.contentItems.length,
      note: t("dashboard.metrics.contentItems.note") ?? "Canonical Phase 2 pipeline root objects."
    },
    {
      key: "qa_ready",
      label: t("dashboard.metrics.qaReady.label") ?? "QA ready",
      value: qaReadyCount,
      note: t("dashboard.metrics.qaReady.note") ?? "Only items with all 3 required assets reach QA_ready."
    },
    {
      key: "publish_eligible",
      label: t("dashboard.metrics.publishEligible.label") ?? "Publish eligible",
      value: eligibleCount,
      note: t("dashboard.metrics.publishEligible.note") ?? "QA passed and thresholds met."
    },
    {
      key: "published",
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

        {(liveData.hasNextPage || (liveData.page && liveData.page > 1)) && (
          <div className="mt-3 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-800/60 pt-3 px-2">
            <button
              onClick={() => {
                if (liveData.page && liveData.page > 1) {
                  router.push(`?page=${liveData.page - 1}`);
                }
              }}
              disabled={!liveData.page || liveData.page === 1}
              aria-label={t("dashboard.pagination.previous") ?? "Trang trước"}
              className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              ← {t("dashboard.pagination.previous") ?? "Trang trước"}
            </button>
            <div className="text-xs font-bold text-cyan-600 dark:text-cyan-400">
              {t("dashboard.pagination.page") ?? "Trang"} {liveData.page || 1}
            </div>
            <button
              onClick={() => {
                router.push(`?page=${(liveData.page || 1) + 1}`);
              }}
              disabled={!liveData.hasNextPage}
              aria-label={t("dashboard.pagination.next") ?? "Trang tiếp"}
              className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              {t("dashboard.pagination.next") ?? "Trang tiếp"} →
            </button>
          </div>
        )}
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
                  <div key={lesson.id} className="relative overflow-hidden rounded-2xl border border-emerald-200/60 dark:border-emerald-800 bg-gradient-to-br from-white to-emerald-50/50 dark:from-slate-900 dark:to-emerald-950/20 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 group">
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


