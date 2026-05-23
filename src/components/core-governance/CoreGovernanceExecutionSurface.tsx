"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/useI18n";

type Stat = {
  label: string;
  value: string;
};

type BoundaryGroup = {
  title: string;
  items: string[];
};

export function CoreGovernanceExecutionSurface() {
  const { t } = useI18n("coreGovernance");

  const summary: Stat[] = [
    { label: t("coreGovernance.summary.state") ?? "State", value: t("coreGovernance.summary.stateValue") ?? "Read-only" },
    { label: t("coreGovernance.summary.source") ?? "Source", value: t("coreGovernance.summary.sourceValue") ?? "062_DEPARTMENT_EXECUTION_ROADMAP_v1.md" },
    { label: t("coreGovernance.summary.phase") ?? "Phase", value: t("coreGovernance.summary.phaseValue") ?? "Department execution" },
    { label: t("coreGovernance.summary.reason") ?? "Reason", value: t("coreGovernance.summary.reasonValue") ?? "Business Truth escalation -> final human finality" }
  ];

  const routeItems = [
    t("coreGovernance.route.itemOne") ?? "Route only canonical conflicts and boundary cases",
    t("coreGovernance.route.itemTwo") ?? "Keep routing explicit and visible",
    t("coreGovernance.route.itemThree") ?? "Never silently self-resolve"
  ];

  const normalizationItems = [
    t("coreGovernance.normalization.itemOne") ?? "Normalize read models before reconciliation",
    t("coreGovernance.normalization.itemTwo") ?? "Remove drift without inventing new truth",
    t("coreGovernance.normalization.itemThree") ?? "Preserve lineage and boundary flags"
  ];

  const reconciliationItems = [
    t("coreGovernance.reconciliation.itemOne") ?? "Reconcile conflicting canonical views",
    t("coreGovernance.reconciliation.itemTwo") ?? "Prefer explicit escalation over hidden merges",
    t("coreGovernance.reconciliation.itemThree") ?? "Record unresolved gaps as boundary issues"
  ];

  const blockItems = [
    t("coreGovernance.block.itemOne") ?? "Stop when a surface tries to mutate authority",
    t("coreGovernance.block.itemTwo") ?? "Block any self-approval or bypass attempt",
    t("coreGovernance.block.itemThree") ?? "Fail closed on unknown or incomplete state"
  ];

  const escalateItems = [
    t("coreGovernance.escalate.itemOne") ?? "Escalate unresolved truth conflicts from Business Truth",
    t("coreGovernance.escalate.itemTwo") ?? "Route ambiguity to the human boundary",
    t("coreGovernance.escalate.itemThree") ?? "Preserve a clear escalation chain"
  ];

  const businessTruthPath = [
    t("coreGovernance.handoff.businessTruth.one") ?? "Business Truth conflict packet",
    t("coreGovernance.handoff.businessTruth.two") ?? "Normalization note",
    t("coreGovernance.handoff.businessTruth.three") ?? "Reconciliation target"
  ];

  const finalHumanFinality = [
    t("coreGovernance.finalHuman.one") ?? "Final human approval only at the boundary",
    t("coreGovernance.finalHuman.two") ?? "No automated self-finality",
    t("coreGovernance.finalHuman.three") ?? "All overrides remain explicit and logged"
  ];

  const allowedSignals = [
    t("coreGovernance.qa.allowed.one") ?? "Read-only routing and normalization visibility",
    t("coreGovernance.qa.allowed.two") ?? "Explicit escalation preview from Business Truth",
    t("coreGovernance.qa.allowed.three") ?? "Human finality boundary stays visible"
  ];

  const blockedSignals = [
    t("coreGovernance.qa.blocked.one") ?? "Self-approval",
    t("coreGovernance.qa.blocked.two") ?? "Silent reconciliation",
    t("coreGovernance.qa.blocked.three") ?? "Any runtime or DB write semantics"
  ];

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
            {t("coreGovernance.summary.title") ?? "Execution summary"}
          </div>
          <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
            {t("coreGovernance.summary.readOnly") ?? "Read-only"}
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summary.map((item) => (
            <SummaryStat key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
        <SurfaceCard
          title={t("coreGovernance.route.title") ?? "Routing"}
          description={t("coreGovernance.route.description") ?? "Route canonical conflicts, boundary cases, and explicit escalation paths only."}
        >
          <div className="grid gap-3">
            {routeItems.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          title={t("coreGovernance.normalization.title") ?? "Normalization"}
          description={t("coreGovernance.normalization.description") ?? "Normalize read models without introducing new authority."}
        >
          <div className="grid gap-3">
            {normalizationItems.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.98fr_1.02fr]">
        <SurfaceCard
          title={t("coreGovernance.reconciliation.title") ?? "Reconciliation"}
          description={t("coreGovernance.reconciliation.description") ?? "Resolve or surface conflicts with explicit human boundaries."}
        >
          <div className="grid gap-3">
            {reconciliationItems.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          title={t("coreGovernance.block.title") ?? "Block"}
          description={t("coreGovernance.block.description") ?? "Fail closed on unknown state, bypass attempts, or self-approval."}
        >
          <div className="grid gap-3">
            {blockItems.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
        <SurfaceCard
          title={t("coreGovernance.escalate.title") ?? "Escalate"}
          description={t("coreGovernance.escalate.description") ?? "Escalation keeps final human finality visible and explicit."}
        >
          <div className="grid gap-3">
            {escalateItems.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          title={t("coreGovernance.handoff.businessTruth.title") ?? "Handoff from Business Truth"}
          description={t("coreGovernance.handoff.businessTruth.description") ?? "Business Truth reaches Core Governance only when escalation or reconciliation is required."}
        >
          <div className="grid gap-3">
            {businessTruthPath.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.98fr_1.02fr]">
        <SurfaceCard
          title={t("coreGovernance.finalHuman.title") ?? "Final human finality preview"}
          description={t("coreGovernance.finalHuman.description") ?? "This is the only place where final human finality remains visible in the chain."}
        >
          <div className="grid gap-3">
            {finalHumanFinality.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          title={t("coreGovernance.qaBoundary.title") ?? "QA boundary preview"}
          description={t("coreGovernance.qaBoundary.description") ?? "Core Governance stays read-only, fail-closed, and outside mutation authority."}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <BoundaryColumn
              tone="emerald"
              title={t("coreGovernance.qaBoundary.allowedTitle") ?? "Allowed signals"}
              items={allowedSignals}
            />
            <BoundaryColumn
              tone="rose"
              title={t("coreGovernance.qaBoundary.blockedTitle") ?? "Blocked signals"}
              items={blockedSignals}
            />
          </div>
        </SurfaceCard>
      </div>

      <details className="rounded-2xl border border-slate-800 bg-slate-950/70">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-white">
          {t("coreGovernance.reference.title") ?? "Reference spine"}
        </summary>
        <div className="border-t border-slate-800 px-5 py-4 text-sm text-slate-300">
          <div>{t("coreGovernance.reference.description") ?? "This surface is scaffolded from the execution roadmap and boundary-layer references only."}</div>
          <div className="mt-3 grid gap-2 text-xs text-slate-400">
            <div>{t("coreGovernance.reference.roadmap") ?? "Roadmap"}: 062_DEPARTMENT_EXECUTION_ROADMAP_v1.md</div>
            <div>{t("coreGovernance.reference.businessTruth") ?? "Business Truth source"}: Business Truth execution surface</div>
            <div>{t("coreGovernance.reference.finality") ?? "Finality"}: human-only boundary preview</div>
          </div>
        </div>
      </details>
    </div>
  );
}

function SurfaceCard({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
      <div className="border-b border-slate-800/90 pb-4">
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="mt-1 text-xs text-slate-400">{description}</div>
      </div>
      <div className="pt-4">{children}</div>
    </section>
  );
}

function SummaryStat({ label, value }: Stat) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-medium text-white">{value}</div>
    </div>
  );
}

function PillLine({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/55 px-4 py-3 text-sm text-slate-200">
      {children}
    </div>
  );
}

function BoundaryColumn({
  tone,
  title,
  items
}: {
  tone: "emerald" | "rose";
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-4">
      <div
        className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${
          tone === "emerald"
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
            : "border-rose-500/30 bg-rose-500/10 text-rose-100"
        }`}
      >
        {title}
      </div>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <div key={item} className="rounded-lg border border-slate-800/80 bg-slate-950/65 px-3 py-2 text-sm text-slate-200">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
