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

export function BusinessTruthExecutionSurface() {
  const { t } = useI18n("businessTruth");

  const summary: Stat[] = [
    { label: t("businessTruth.summary.state") ?? "State", value: t("businessTruth.summary.stateValue") ?? "Read-only" },
    { label: t("businessTruth.summary.source") ?? "Source", value: t("businessTruth.summary.sourceValue") ?? "062_DEPARTMENT_EXECUTION_ROADMAP_v1.md" },
    { label: t("businessTruth.summary.phase") ?? "Phase", value: t("businessTruth.summary.phaseValue") ?? "Department execution" },
    { label: t("businessTruth.summary.reason") ?? "Reason", value: t("businessTruth.summary.reasonValue") ?? "Customer feedback -> Business Truth -> Core Governance boundary" }
  ];

  const billingItems = [
    t("businessTruth.billing.itemOne") ?? "Billing truth remains authoritative and read-only here",
    t("businessTruth.billing.itemTwo") ?? "No UI-derived price calculations or mutations",
    t("businessTruth.billing.itemThree") ?? "Keep package truth and billing truth aligned"
  ];

  const authItems = [
    t("businessTruth.auth.itemOne") ?? "Auth state is rendered, not changed",
    t("businessTruth.auth.itemTwo") ?? "Identity boundaries are visible but immutable",
    t("businessTruth.auth.itemThree") ?? "Any session mutation stays outside this surface"
  ];

  const identityItems = [
    t("businessTruth.identity.itemOne") ?? "Identity truth is canonical and normalized",
    t("businessTruth.identity.itemTwo") ?? "No alias rewriting or inferred ownership edits",
    t("businessTruth.identity.itemThree") ?? "Customer feedback may reference identity issues only"
  ];

  const offerItems = [
    t("businessTruth.offer.itemOne") ?? "Offer truth is approved before it reaches downstream surfaces",
    t("businessTruth.offer.itemTwo") ?? "No new offer authority is created here",
    t("businessTruth.offer.itemThree") ?? "Claim boundaries must stay explicit"
  ];

  const packageItems = [
    t("businessTruth.package.itemOne") ?? "Package truth stays synchronized with approved billing and offer data",
    t("businessTruth.package.itemTwo") ?? "Treat package metadata as canonical read model content",
    t("businessTruth.package.itemThree") ?? "No package mutation or price drift"
  ];

  const customerHandoff = [
    t("businessTruth.handoff.customer.one") ?? "Customer feedback summary",
    t("businessTruth.handoff.customer.two") ?? "Canonical issue pattern",
    t("businessTruth.handoff.customer.three") ?? "Boundary flags and correction signals"
  ];

  const coreGovernanceBoundary = [
    t("businessTruth.boundary.coreGovernance.one") ?? "Escalate unresolved truth conflicts",
    t("businessTruth.boundary.coreGovernance.two") ?? "Normalize and reconcile read models",
    t("businessTruth.boundary.coreGovernance.three") ?? "Protect final human finality"
  ];

  const allowedSignals = [
    t("businessTruth.qa.allowed.one") ?? "Read-only billing, auth, identity, offer, and package views",
    t("businessTruth.qa.allowed.two") ?? "Explicit handoff preview from Customer",
    t("businessTruth.qa.allowed.three") ?? "Boundary preview for Core Governance"
  ];

  const blockedSignals = [
    t("businessTruth.qa.blocked.one") ?? "Direct price edits",
    t("businessTruth.qa.blocked.two") ?? "Identity mutation",
    t("businessTruth.qa.blocked.three") ?? "Any runtime or DB write semantics"
  ];

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
            {t("businessTruth.summary.title") ?? "Execution summary"}
          </div>
          <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
            {t("businessTruth.summary.readOnly") ?? "Read-only"}
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
          title={t("businessTruth.billing.title") ?? "Billing truth"}
          description={t("businessTruth.billing.description") ?? "Billing is displayed as canonical read model truth only."}
        >
          <div className="grid gap-3">
            {billingItems.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          title={t("businessTruth.auth.title") ?? "Auth truth"}
          description={t("businessTruth.auth.description") ?? "Auth state is visible here, but the surface cannot modify identity or session state."}
        >
          <div className="grid gap-3">
            {authItems.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.98fr_1.02fr]">
        <SurfaceCard
          title={t("businessTruth.identity.title") ?? "Identity truth"}
          description={t("businessTruth.identity.description") ?? "Identity is normalized and read-only so downstream surfaces can trust the mapping."}
        >
          <div className="grid gap-3">
            {identityItems.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          title={t("businessTruth.offer.title") ?? "Offer truth"}
          description={t("businessTruth.offer.description") ?? "Offer truth is authoritative, bounded, and not mutable from this surface."}
        >
          <div className="grid gap-3">
            {offerItems.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
        <SurfaceCard
          title={t("businessTruth.package.title") ?? "Package truth"}
          description={t("businessTruth.package.description") ?? "Package truth stays aligned with billing and offer data as a read-only mirror."}
        >
          <div className="grid gap-3">
            {packageItems.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          title={t("businessTruth.handoff.customer.title") ?? "Handoff from Customer"}
          description={t("businessTruth.handoff.customer.description") ?? "Customer feedback arrives as canonical issue summaries and correction signals only."}
        >
          <div className="grid gap-3">
            {customerHandoff.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
        <SurfaceCard
          title={t("businessTruth.boundary.coreGovernance.title") ?? "Boundary preview for Core Governance"}
          description={t("businessTruth.boundary.coreGovernance.description") ?? "Escalation stays explicit and moves unresolved conflicts into Core Governance."}
        >
          <div className="grid gap-3">
            {coreGovernanceBoundary.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          title={t("businessTruth.qaBoundary.title") ?? "QA boundary preview"}
          description={t("businessTruth.qaBoundary.description") ?? "Business Truth stays read-only, fail-closed, and outside runtime mutation."}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <BoundaryColumn
              tone="emerald"
              title={t("businessTruth.qaBoundary.allowedTitle") ?? "Allowed signals"}
              items={allowedSignals}
            />
            <BoundaryColumn
              tone="rose"
              title={t("businessTruth.qaBoundary.blockedTitle") ?? "Blocked signals"}
              items={blockedSignals}
            />
          </div>
        </SurfaceCard>
      </div>

      <details className="rounded-2xl border border-slate-800 bg-slate-950/70">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-white">
          {t("businessTruth.reference.title") ?? "Reference spine"}
        </summary>
        <div className="border-t border-slate-800 px-5 py-4 text-sm text-slate-300">
          <div>{t("businessTruth.reference.description") ?? "This surface is scaffolded from the execution roadmap and governed handoff chain only."}</div>
          <div className="mt-3 grid gap-2 text-xs text-slate-400">
            <div>{t("businessTruth.reference.roadmap") ?? "Roadmap"}: 062_DEPARTMENT_EXECUTION_ROADMAP_v1.md</div>
            <div>{t("businessTruth.reference.customer") ?? "Customer source"}: Customer execution surface</div>
            <div>{t("businessTruth.reference.coreGovernance") ?? "Core Governance boundary"}: Escalation-only preview</div>
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
