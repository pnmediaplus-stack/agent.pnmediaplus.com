"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/useI18n";
import { StateBadge } from "@/components/shared/StateBadge";

type Stat = {
  label: string;
  value: string;
};

export function CustomerExecutionSurface() {
  const { t } = useI18n("customer");

  const summary: Stat[] = [
    { label: t("customer.summary.state") ?? "State", value: t("customer.summary.stateValue") ?? "Read-only" },
    { label: t("customer.summary.source") ?? "Source", value: t("customer.summary.sourceValue") ?? "062_DEPARTMENT_EXECUTION_ROADMAP_v1.md" },
    { label: t("customer.summary.phase") ?? "Phase", value: t("customer.summary.phaseValue") ?? "Department execution" },
    { label: t("customer.summary.reason") ?? "Reason", value: t("customer.summary.reasonValue") ?? "Operations handoff -> Business Truth feedback loop" }
  ];

  const intakeItems = [
    t("customer.intake.itemOne") ?? "Capture customer-facing issues without mutation",
    t("customer.intake.itemTwo") ?? "Separate issue intake from offer or pricing authority",
    t("customer.intake.itemThree") ?? "Keep intake canonical and traceable"
  ];

  const triageItems = [
    t("customer.triage.itemOne") ?? "Classify by impact, urgency, and ownership",
    t("customer.triage.itemTwo") ?? "Escalate when the issue touches truth boundaries",
    t("customer.triage.itemThree") ?? "Route feedback back into governed systems only"
  ];

  const escalationItems = [
    t("customer.escalation.itemOne") ?? "Issue crosses offer, pricing, or identity boundaries",
    t("customer.escalation.itemTwo") ?? "Customer claim conflicts with canonical truth",
    t("customer.escalation.itemThree") ?? "Resolution requires authority beyond Customer"
  ];

  const feedbackItems = [
    t("customer.feedback.itemOne") ?? "Summarize patterns for operations review",
    t("customer.feedback.itemTwo") ?? "Retain a closed loop into business truth",
    t("customer.feedback.itemThree") ?? "Avoid creating new source-of-truth records here"
  ];

  const issues = [
    {
      id: "issue-001",
      title: t("customer.issue.one.title") ?? "Delivery timing question",
      owner: t("customer.issue.one.owner") ?? "Customer Intake",
      status: "OPEN",
      summary: t("customer.issue.one.summary") ?? "Waiting for routing confirmation from Operations.",
      note: t("customer.issue.one.note") ?? "No mutation. Track as routed question."
    },
    {
      id: "issue-002",
      title: t("customer.issue.two.title") ?? "Offer claim clarification",
      owner: t("customer.issue.two.owner") ?? "Triage Desk",
      status: "IN_PROGRESS",
      summary: t("customer.issue.two.summary") ?? "Needs canonical answer from Business Truth.",
      note: t("customer.issue.two.note") ?? "Escalated out of Customer authority."
    },
    {
      id: "issue-003",
      title: t("customer.issue.three.title") ?? "Pricing boundary concern",
      owner: t("customer.issue.three.owner") ?? "Escalation Queue",
      status: "BLOCKED",
      summary: t("customer.issue.three.summary") ?? "Blocked until authoritative pricing truth is confirmed.",
      note: t("customer.issue.three.note") ?? "Do not infer or negotiate price here."
    },
    {
      id: "issue-004",
      title: t("customer.issue.four.title") ?? "Resolved feedback summary",
      owner: t("customer.issue.four.owner") ?? "Feedback Summary",
      status: "DONE",
      summary: t("customer.issue.four.summary") ?? "Captured and routed for business truth review.",
      note: t("customer.issue.four.note") ?? "Closed loop, no runtime mutation."
    }
  ];

  const operationsHandoff = [
    t("customer.handoff.operations.one") ?? "Operations handoff packet",
    t("customer.handoff.operations.two") ?? "Escalation status and routing context",
    t("customer.handoff.operations.three") ?? "Customer-facing summary payload"
  ];

  const businessTruthLoop = [
    t("customer.handoff.businessTruth.one") ?? "Feedback synopsis",
    t("customer.handoff.businessTruth.two") ?? "Canonical issue pattern",
    t("customer.handoff.businessTruth.three") ?? "Truth correction signal"
  ];

  const qaBoundaryAllowed = [
    t("customer.qa.allowed.one") ?? "Read-only intake and triage",
    t("customer.qa.allowed.two") ?? "Explicit escalation paths",
    t("customer.qa.allowed.three") ?? "Closed feedback loop to Business Truth"
  ];

  const qaBoundaryBlocked = [
    t("customer.qa.blocked.one") ?? "Offer edits",
    t("customer.qa.blocked.two") ?? "Pricing authority",
    t("customer.qa.blocked.three") ?? "Self-approval or hidden state writes"
  ];

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
            {t("customer.summary.title") ?? "Execution summary"}
          </div>
          <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
            {t("customer.summary.readOnly") ?? "Read-only"}
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
          title={t("customer.intake.title") ?? "Intake"}
          description={t("customer.intake.description") ?? "Customer intake stays read-only, canonical, and outside offer or pricing authority."}
        >
          <div className="grid gap-3">
            {intakeItems.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          title={t("customer.triage.title") ?? "Triage"}
          description={t("customer.triage.description") ?? "Classify and route issues without mutating source truth."}
        >
          <div className="grid gap-3">
            {triageItems.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.98fr_1.02fr]">
        <SurfaceCard
          title={t("customer.escalation.title") ?? "Escalation"}
          description={t("customer.escalation.description") ?? "Escalate when resolution crosses authority or truth boundaries."}
        >
          <div className="grid gap-3">
            {escalationItems.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          title={t("customer.feedback.title") ?? "Feedback summary"}
          description={t("customer.feedback.description") ?? "Aggregate customer signals for operations review and business truth feedback."}
        >
          <div className="grid gap-3">
            {feedbackItems.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard
        title={t("customer.issueStatus.title") ?? "Issue status"}
        description={t("customer.issueStatus.description") ?? "Visible issue rows only. No mutation controls, no hidden state transitions."}
      >
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
            <thead className="bg-slate-900/70 text-xs uppercase tracking-[0.22em] text-slate-400">
              <tr>
                <th className="px-4 py-3">{t("customer.issueStatus.table.issue") ?? "Issue"}</th>
                <th className="px-4 py-3">{t("customer.issueStatus.table.owner") ?? "Owner"}</th>
                <th className="px-4 py-3">{t("customer.issueStatus.table.status") ?? "Status"}</th>
                <th className="px-4 py-3">{t("customer.issueStatus.table.summary") ?? "Summary"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/70">
              {issues.map((issue) => (
                <tr key={issue.id} className="text-slate-300">
                  <td className="px-4 py-4">
                    <div className="font-medium text-white">{issue.title}</div>
                    <div className="text-xs text-slate-500">{issue.id}</div>
                  </td>
                  <td className="px-4 py-4">{issue.owner}</td>
                  <td className="px-4 py-4">
                    <StateBadge label={issue.status} displayLabel={t(`customer.issue.status.${issue.status}`) ?? issue.status} />
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-slate-200">{issue.summary}</div>
                    <div className="mt-1 text-xs text-slate-500">{issue.note}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SurfaceCard>

      <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
        <SurfaceCard
          title={t("customer.handoff.operations.title") ?? "Handoff from Operations to Customer"}
          description={t("customer.handoff.operations.description") ?? "Customer receives routing and escalation context from Operations without gaining mutation authority."}
        >
          <div className="grid gap-3">
            {operationsHandoff.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          title={t("customer.handoff.businessTruth.title") ?? "Feedback loop to Business Truth"}
          description={t("customer.handoff.businessTruth.description") ?? "Customer feedback loops back as canonical issue patterns and truth correction signals."}
        >
          <div className="grid gap-3">
            {businessTruthLoop.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.98fr_1.02fr]">
        <SurfaceCard
          title={t("customer.qaBoundary.title") ?? "QA boundary preview"}
          description={t("customer.qaBoundary.description") ?? "Customer stays within read-only intake, triage, and escalation boundaries."}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <BoundaryColumn
              tone="emerald"
              title={t("customer.qaBoundary.allowedTitle") ?? "Allowed signals"}
              items={qaBoundaryAllowed}
            />
            <BoundaryColumn
              tone="rose"
              title={t("customer.qaBoundary.blockedTitle") ?? "Blocked signals"}
              items={qaBoundaryBlocked}
            />
          </div>
        </SurfaceCard>

        <SurfaceCard
          title={t("customer.reference.title") ?? "Reference spine"}
          description={t("customer.reference.description") ?? "This surface is scaffolded from the execution roadmap and governed handoff chain only."}
        >
          <div className="grid gap-3">
            <PillLine>{t("customer.reference.roadmap") ?? "Roadmap"}: 062_DEPARTMENT_EXECUTION_ROADMAP_v1.md</PillLine>
            <PillLine>{t("customer.reference.operations") ?? "Operations source"}: Operations execution surface</PillLine>
            <PillLine>{t("customer.reference.businessTruth") ?? "Business Truth loop"}: Feedback summary only</PillLine>
          </div>
        </SurfaceCard>
      </div>
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
