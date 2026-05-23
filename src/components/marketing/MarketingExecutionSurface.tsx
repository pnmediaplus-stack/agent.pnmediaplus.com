"use client";

import { useI18n } from "@/lib/i18n/useI18n";

type Stat = {
  label: string;
  value: string;
};

type BulletGroup = {
  title: string;
  items: string[];
};

export function MarketingExecutionSurface() {
  const { t } = useI18n("marketing");

  const summary: Stat[] = [
    {
      label: t("marketing.summary.state") ?? "State",
      value: t("marketing.summary.stateValue") ?? "Read-only"
    },
    {
      label: t("marketing.summary.source") ?? "Source",
      value: t("marketing.summary.sourceValue") ?? "062_DEPARTMENT_EXECUTION_ROADMAP_v1.md"
    },
    {
      label: t("marketing.summary.phase") ?? "Phase",
      value: t("marketing.summary.phaseValue") ?? "Department execution"
    },
    {
      label: t("marketing.summary.reason") ?? "Reason",
      value: t("marketing.summary.reasonValue") ?? "Marketing -> Media governed handoff"
    }
  ];

  const positioning: BulletGroup[] = [
    {
      title: t("marketing.positioning.audience") ?? "Audience",
      items: [
        t("marketing.positioning.audienceValue") ?? "Decision makers who need a safe, governed narrative",
        t("marketing.positioning.segmentValue") ?? "Buyer / operator / approver framing"
      ]
    },
    {
      title: t("marketing.positioning.promise") ?? "Promise",
      items: [
        t("marketing.positioning.promiseValue") ?? "Translate verified truth into market-ready language",
        t("marketing.positioning.supportValue") ?? "Keep claims inside the approved boundary"
      ]
    },
    {
      title: t("marketing.positioning.proof") ?? "Proof direction",
      items: [
        t("marketing.positioning.proofValue") ?? "Reference only sanctioned evidence",
        t("marketing.positioning.outputValue") ?? "Hand off governed inputs to Media"
      ]
    }
  ];

  const gtmFraming = [
    t("marketing.gtm.frameOne") ?? "Problem -> proof -> promise",
    t("marketing.gtm.frameTwo") ?? "Lead with bounded claims, not launch authority",
    t("marketing.gtm.frameThree") ?? "Adapt for campaign brief, not for truth mutation"
  ];

  const briefItems = [
    t("marketing.brief.goalValue") ?? "Define the governed marketing goal",
    t("marketing.brief.inputsValue") ?? "Use approved product truth and market signals",
    t("marketing.brief.outputsValue") ?? "Positioning memo, campaign brief, and Media handoff"
  ];

  const claimBoundaryAllowed = [
    t("marketing.claimBoundary.allowed.one") ?? "State verified benefits",
    t("marketing.claimBoundary.allowed.two") ?? "Reference approved proof",
    t("marketing.claimBoundary.allowed.three") ?? "Package a brief for Media"
  ];

  const claimBoundaryBlocked = [
    t("marketing.claimBoundary.blocked.one") ?? "Invent offer truth",
    t("marketing.claimBoundary.blocked.two") ?? "Set price or billing authority",
    t("marketing.claimBoundary.blocked.three") ?? "Self-launch or bypass handoff"
  ];

  const handoffItems = [
    t("marketing.handoff.requiredInputs.one") ?? "Positioning memo",
    t("marketing.handoff.requiredInputs.two") ?? "Claim boundary",
    t("marketing.handoff.requiredInputs.three") ?? "Approved proof references"
  ];

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
            {t("marketing.summary.title") ?? "Execution summary"}
          </div>
          <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
            {t("marketing.summary.readOnly") ?? "Read-only"}
          </span>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summary.map((item) => (
            <SummaryStat key={item.label} label={item.label} value={item.value} />
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <SurfaceCard
          title={t("marketing.positioning.title") ?? "Positioning"}
          description={t("marketing.positioning.description") ?? "Translate verified truth into a clear, governed market story."}
        >
          <div className="grid gap-3">
            {positioning.map((group) => (
              <div key={group.title} className="rounded-xl border border-slate-800 bg-slate-900/55 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">{group.title}</div>
                <div className="mt-3 grid gap-2">
                  {group.items.map((item) => (
                    <div key={item} className="rounded-lg border border-slate-800/80 bg-slate-950/65 px-3 py-2 text-sm text-slate-200">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          title={t("marketing.gtm.title") ?? "GTM framing"}
          description={t("marketing.gtm.description") ?? "Keep go-to-market framing narrow, proof-led, and handoff-ready."}
        >
          <div className="grid gap-3">
            {gtmFraming.map((item) => (
              <div key={item} className="rounded-xl border border-slate-800 bg-slate-900/55 px-4 py-3 text-sm text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <SurfaceCard
          title={t("marketing.brief.title") ?? "Brief"}
          description={t("marketing.brief.description") ?? "The brief captures the approved marketing direction without inventing truth."}
        >
          <div className="grid gap-3">
            {briefItems.map((item) => (
              <div key={item} className="rounded-xl border border-slate-800 bg-slate-900/55 px-4 py-3 text-sm text-slate-200">
                {item}
              </div>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          title={t("marketing.claimBoundary.title") ?? "Claim boundary"}
          description={t("marketing.claimBoundary.description") ?? "What Marketing may say, what it must not say, and how to stay inside approval."}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <BoundaryColumn
              tone="emerald"
              title={t("marketing.claimBoundary.allowedTitle") ?? "Allowed"}
              items={claimBoundaryAllowed}
            />
            <BoundaryColumn
              tone="rose"
              title={t("marketing.claimBoundary.blockedTitle") ?? "Not allowed"}
              items={claimBoundaryBlocked}
            />
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard
        title={t("marketing.handoff.title") ?? "Handoff to Media"}
        description={t("marketing.handoff.description") ?? "Prepared inputs only. Media receives the governed brief and owns asset execution."}
      >
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            <KeyValueRow
              label={t("marketing.handoff.target") ?? "Target"}
              value={t("marketing.handoff.targetValue") ?? "Media"}
            />
            <KeyValueRow
              label={t("marketing.handoff.nextOwner") ?? "Next owner"}
              value={t("marketing.handoff.nextOwnerValue") ?? "Media execution"}
            />
            <KeyValueRow
              label={t("marketing.handoff.qualityGate") ?? "Quality gate"}
              value={t("marketing.handoff.qualityGateValue") ?? "Claim boundary must stay intact"}
            />
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/55 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              {t("marketing.handoff.requiredInputs") ?? "Required inputs"}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {handoffItems.map((item) => (
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
          {t("marketing.reference.title") ?? "Reference spine"}
        </summary>
        <div className="border-t border-slate-800 px-5 py-4 text-sm text-slate-300">
          <div>{t("marketing.reference.description") ?? "This surface is scaffolded from the execution roadmap and governance pack only."}</div>
          <div className="mt-3 grid gap-2 text-xs text-slate-400">
            <div>{t("marketing.reference.roadmap") ?? "Roadmap"}: 062_DEPARTMENT_EXECUTION_ROADMAP_v1.md</div>
            <div>{t("marketing.reference.charter") ?? "Charter"}: 054_MARKETING_ROOM_CHARTER_v1.md</div>
            <div>{t("marketing.reference.mediaFlow") ?? "Media flow"}: 056_MARKETING_MEDIA_FLOW_v1.md</div>
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
  children: React.ReactNode;
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
