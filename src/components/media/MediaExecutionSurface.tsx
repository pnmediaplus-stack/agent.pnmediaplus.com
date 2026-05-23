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

export function MediaExecutionSurface() {
  const { t } = useI18n("media");

  const summary: Stat[] = [
    {
      label: t("media.summary.state") ?? "State",
      value: t("media.summary.stateValue") ?? "Read-only"
    },
    {
      label: t("media.summary.source") ?? "Source",
      value: t("media.summary.sourceValue") ?? "062_DEPARTMENT_EXECUTION_ROADMAP_v1.md"
    },
    {
      label: t("media.summary.phase") ?? "Phase",
      value: t("media.summary.phaseValue") ?? "Department execution"
    },
    {
      label: t("media.summary.reason") ?? "Reason",
      value: t("media.summary.reasonValue") ?? "Marketing handoff -> Media production -> Operations"
    }
  ];

  const productionItems = [
    t("media.production.itemOne") ?? "Adapt governed assets without altering truth",
    t("media.production.itemTwo") ?? "Package derivatives for channel-ready delivery",
    t("media.production.itemThree") ?? "Keep variants tied to approved source copy"
  ];

  const promptItems = [
    t("media.prompt.itemOne") ?? "Prompt kernel locked to approved claim boundary",
    t("media.prompt.itemTwo") ?? "Variant prompts inherit governed message spine",
    t("media.prompt.itemThree") ?? "No prompt may expand authority or invent facts"
  ];

  const motionItems = [
    t("media.motion.itemOne") ?? "Motion scopes product proof and process clarity",
    t("media.motion.itemTwo") ?? "Animation stays inside the approved frame",
    t("media.motion.itemThree") ?? "No launch semantics or fake KPI overlays"
  ];

  const captionItems = [
    t("media.caption.itemOne") ?? "Caption packages remain claim-safe and channel-aware",
    t("media.caption.itemTwo") ?? "Copy variants map back to approved proof",
    t("media.caption.itemThree") ?? "No hidden offer changes or pricing claims"
  ];

  const readinessAllowed = [
    t("media.readiness.allowed.one") ?? "Asset conforms to approved copy",
    t("media.readiness.allowed.two") ?? "Motion and captions are source-linked",
    t("media.readiness.allowed.three") ?? "QA boundary is satisfied"
  ];

  const readinessBlocked = [
    t("media.readiness.blocked.one") ?? "Unverified claim wording",
    t("media.readiness.blocked.two") ?? "Missing proof references",
    t("media.readiness.blocked.three") ?? "Any self-launch or publish action"
  ];

  const handoffInputs = [
    t("media.handoff.inputOne") ?? "Positioning memo",
    t("media.handoff.inputTwo") ?? "Campaign brief",
    t("media.handoff.inputThree") ?? "Claim boundary",
    t("media.handoff.inputFour") ?? "Approved proof references"
  ];

  const qaChecks = [
    t("media.qa.checkOne") ?? "Verify claim boundary remains intact",
    t("media.qa.checkTwo") ?? "Confirm no publish semantics are embedded",
    t("media.qa.checkThree") ?? "Check captions, motion, and asset variants against source"
  ];

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
            {t("media.summary.title") ?? "Execution summary"}
          </div>
          <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
            {t("media.summary.readOnly") ?? "Read-only"}
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summary.map((item) => (
            <SummaryStat key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.04fr_0.96fr]">
        <SurfaceCard
          title={t("media.production.title") ?? "Asset production"}
          description={t("media.production.description") ?? "Prepare governed assets for adaptation and packaging without changing the underlying truth."}
        >
          <div className="grid gap-3">
            {productionItems.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          title={t("media.prompt.title") ?? "Prompt architecture"}
          description={t("media.prompt.description") ?? "Prompt structures stay locked to approved messaging and claim boundaries."}
        >
          <div className="grid gap-3">
            {promptItems.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.96fr_1.04fr]">
        <SurfaceCard
          title={t("media.motion.title") ?? "Motion"}
          description={t("media.motion.description") ?? "Motion packaging stays inside governed proof and avoids simulated authority."}
        >
          <div className="grid gap-3">
            {motionItems.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          title={t("media.caption.title") ?? "Caption packaging"}
          description={t("media.caption.description") ?? "Caption variants remain channel-aware, source-linked, and claim-safe."}
        >
          <div className="grid gap-3">
            {captionItems.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.04fr_0.96fr]">
        <SurfaceCard
          title={t("media.readiness.title") ?? "Publish readiness"}
          description={t("media.readiness.description") ?? "A packet is only ready when source copy, QA, and claim controls are aligned."}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <BoundaryColumn
              tone="emerald"
              title={t("media.readiness.allowedTitle") ?? "Ready signals"}
              items={readinessAllowed}
            />
            <BoundaryColumn
              tone="rose"
              title={t("media.readiness.blockedTitle") ?? "Blocked signals"}
              items={readinessBlocked}
            />
          </div>
        </SurfaceCard>

        <SurfaceCard
          title={t("media.qaBoundary.title") ?? "QA boundary preview"}
          description={t("media.qaBoundary.description") ?? "Preview the boundary QA will use before any publish-ready handoff can move onward."}
        >
          <div className="grid gap-3">
            {qaChecks.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard
        title={t("media.handoff.title") ?? "Handoff from Marketing to Media"}
        description={t("media.handoff.description") ?? "This surface consumes governed marketing inputs and turns them into asset-ready execution scaffolding."}
      >
        <div className="grid gap-4 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="space-y-3">
            <KeyValueRow label={t("media.handoff.source") ?? "Source"} value={t("media.handoff.sourceValue") ?? "Marketing execution surface"} />
            <KeyValueRow label={t("media.handoff.target") ?? "Target"} value={t("media.handoff.targetValue") ?? "Media execution surface"} />
            <KeyValueRow label={t("media.handoff.guarantee") ?? "Guarantee"} value={t("media.handoff.guaranteeValue") ?? "No claim drift beyond approved boundary"} />
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              {t("media.handoff.requiredInputs") ?? "Required inputs"}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {handoffInputs.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-100"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </SurfaceCard>

      <details className="rounded-2xl border border-slate-800 bg-slate-950/70">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-white">
          {t("media.reference.title") ?? "Reference spine"}
        </summary>
        <div className="border-t border-slate-800 px-5 py-4 text-sm text-slate-300">
          <div>{t("media.reference.description") ?? "This surface is scaffolded from the execution roadmap and marketing-to-media flow references only."}</div>
          <div className="mt-3 grid gap-2 text-xs text-slate-400">
            <div>{t("media.reference.roadmap") ?? "Roadmap"}: 062_DEPARTMENT_EXECUTION_ROADMAP_v1.md</div>
            <div>{t("media.reference.marketing") ?? "Marketing source"}: 054_MARKETING_ROOM_CHARTER_v1.md</div>
            <div>{t("media.reference.flow") ?? "Flow"}: 056_MARKETING_MEDIA_FLOW_v1.md</div>
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

function KeyValueRow({ label, value }: Stat) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-medium text-white">{value}</div>
    </div>
  );
}
