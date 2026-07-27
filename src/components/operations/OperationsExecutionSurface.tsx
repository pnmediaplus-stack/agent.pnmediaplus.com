"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/lib/i18n/useI18n";
import { StateBadge } from "@/components/shared/StateBadge";
import type { WorkflowRun } from "@/types/workflow";

type Stat = {
  label: string;
  value: string;
};

type BoundaryGroup = {
  title: string;
  items: string[];
};

export function OperationsExecutionSurface({ workflowRuns }: { workflowRuns: WorkflowRun[] }) {
  const { t } = useI18n("operations");

  const summary: Stat[] = [
    {
      label: t("operations.summary.state") ?? "State",
      value: t("operations.summary.stateValue") ?? "Read-only"
    },
    {
      label: t("operations.summary.source") ?? "Source",
      value: t("operations.summary.sourceValue") ?? "062_DEPARTMENT_EXECUTION_ROADMAP_v1.md"
    },
    {
      label: t("operations.summary.phase") ?? "Phase",
      value: t("operations.summary.phaseValue") ?? "Department execution"
    },
    {
      label: t("operations.summary.reason") ?? "Reason",
      value: t("operations.summary.reasonValue") ?? "Media execution handoff -> customer output"
    }
  ];

  const executionItems = [
    t("operations.execution.itemOne") ?? "Execute approved flows only",
    t("operations.execution.itemTwo") ?? "Keep run state visible and read-only",
    t("operations.execution.itemThree") ?? "Stop on any guard or authority mismatch"
  ];

  const routingItems = [
    t("operations.routing.itemOne") ?? "Route only canonical work items",
    t("operations.routing.itemTwo") ?? "Escalate when boundary or state becomes ambiguous",
    t("operations.routing.itemThree") ?? "Do not rewrite ownership or bypass handoff"
  ];

  const monitoringItems = [
    t("operations.monitoring.itemOne") ?? "Track run status, duration, and target",
    t("operations.monitoring.itemTwo") ?? "Watch for human wait states and downstream lag",
    t("operations.monitoring.itemThree") ?? "Preserve read-only visibility into runtime"
  ];

  const escalationItems = [
    t("operations.escalation.itemOne") ?? "Missing approval or conflicting state",
    t("operations.escalation.itemTwo") ?? "Runtime drift or routing ambiguity",
    t("operations.escalation.itemThree") ?? "Any attempt to mutate source of truth"
  ];

  const mediaHandoffItems = [
    t("operations.handoff.media.one") ?? "Media handoff packet",
    t("operations.handoff.media.two") ?? "Claim-safe asset bundle",
    t("operations.handoff.media.three") ?? "QA boundary confirmation"
  ];

  const customerOutputItems = [
    t("operations.handoff.customer.one") ?? "Status report",
    t("operations.handoff.customer.two") ?? "Escalation summary",
    t("operations.handoff.customer.three") ?? "Routing outcome"
  ];

  const qaBoundaryAllowed = [
    t("operations.qa.allowed.one") ?? "Approved flows only",
    t("operations.qa.allowed.two") ?? "Run visibility stays read-only",
    t("operations.qa.allowed.three") ?? "Escalations stay explicit"
  ];

  const qaBoundaryBlocked = [
    t("operations.qa.blocked.one") ?? "Self-approval",
    t("operations.qa.blocked.two") ?? "Runtime mutation",
    t("operations.qa.blocked.three") ?? "Hidden routing changes"
  ];

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
            {t("operations.summary.title") ?? "Execution summary"}
          </div>
          <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-100">
            {t("operations.summary.readOnly") ?? "Read-only"}
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
          title={t("operations.execution.title") ?? "Workflow execution"}
          description={t("operations.execution.description") ?? "Read-only execution visibility for approved flows and canonical runtime states."}
        >
          <div className="grid gap-3">
            {executionItems.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          title={t("operations.monitoring.title") ?? "Monitoring"}
          description={t("operations.monitoring.description") ?? "Track runtime visibility without exposing secrets or introducing control surface writes."}
        >
          <div className="grid gap-3">
            {monitoringItems.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.98fr_1.02fr]">
        <SurfaceCard
          title={t("operations.routing.title") ?? "Routing"}
          description={t("operations.routing.description") ?? "Route only canonical work and escalate when the boundary is unclear."}
        >
          <div className="grid gap-3">
            {routingItems.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          title={t("operations.escalation.title") ?? "Escalation"}
          description={t("operations.escalation.description") ?? "Escalate unresolved state, owner conflicts, and runtime drift."}
        >
          <div className="grid gap-3">
            {escalationItems.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
        <SurfaceCard
          title={t("operations.runVisibility.title") ?? "Run visibility"}
          description={t("operations.runVisibility.description") ?? "Visible run rows only. No control buttons, no mutation actions."}
        >
          <div className="overflow-hidden rounded-xl border border-slate-800">
            <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
              <thead className="bg-slate-900/70 text-xs uppercase tracking-[0.22em] text-slate-400">
                <tr>
                  <th className="px-4 py-3">{t("operations.run.table.run") ?? "Run"}</th>
                  <th className="px-4 py-3">{t("operations.run.table.workflow") ?? "Workflow"}</th>
                  <th className="px-4 py-3">{t("operations.run.table.status") ?? "Status"}</th>
                  <th className="px-4 py-3">{t("operations.run.table.duration") ?? "Duration"}</th>
                  <th className="px-4 py-3">{t("operations.run.table.target") ?? "Target"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/70">
                {workflowRuns.map((run) => (
                  <tr key={run.id} className="text-slate-300">
                    <td className="px-4 py-4">
                      <div className="font-medium text-white">{run.name}</div>
                      <div className="text-xs text-slate-500">{run.id}</div>
                    </td>
                    <td className="px-4 py-4">{run.workflowKey}</td>
                    <td className="px-4 py-4">
                      <StateBadge label={run.status} displayLabel={t(`operations.run.status.${run.status}`) ?? run.status} />
                    </td>
                    <td className="px-4 py-4">{run.duration}</td>
                    <td className="px-4 py-4">{run.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>

        <SurfaceCard
          title={t("operations.qaBoundary.title") ?? "QA boundary preview"}
          description={t("operations.qaBoundary.description") ?? "Operations only proceeds when routing, runtime, and escalation states stay inside the guarded boundary."}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <BoundaryColumn
              tone="emerald"
              title={t("operations.qaBoundary.allowedTitle") ?? "Allowed signals"}
              items={qaBoundaryAllowed}
            />
            <BoundaryColumn
              tone="rose"
              title={t("operations.qaBoundary.blockedTitle") ?? "Blocked signals"}
              items={qaBoundaryBlocked}
            />
          </div>
        </SurfaceCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.98fr_1.02fr]">
        <SurfaceCard
          title={t("operations.handoff.media.title") ?? "Handoff from Media to Operations"}
          description={t("operations.handoff.media.description") ?? "Media hands off publish-ready assets, while Operations only receives the governed execution packet."}
        >
          <div className="grid gap-3">
            {mediaHandoffItems.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>

        <SurfaceCard
          title={t("operations.handoff.customer.title") ?? "Output to Customer"}
          description={t("operations.handoff.customer.description") ?? "Operations outputs status, escalation, and routing summaries for customer-facing handling."}
        >
          <div className="grid gap-3">
            {customerOutputItems.map((item) => (
              <PillLine key={item}>{item}</PillLine>
            ))}
          </div>
        </SurfaceCard>
      </div>

      <details className="rounded-2xl border border-slate-800 bg-slate-950/70">
        <summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold text-white">
          {t("operations.reference.title") ?? "Reference spine"}
        </summary>
        <div className="border-t border-slate-800 px-5 py-4 text-sm text-slate-300">
          <div>{t("operations.reference.description") ?? "This surface is scaffolded from the execution roadmap and governed cross-department flow only."}</div>
          <div className="mt-3 grid gap-2 text-xs text-slate-400">
            <div>{t("operations.reference.roadmap") ?? "Roadmap"}: 062_DEPARTMENT_EXECUTION_ROADMAP_v1.md</div>
            <div>{t("operations.reference.media") ?? "Media source"}: Media execution surface</div>
            <div>{t("operations.reference.customer") ?? "Customer output"}: Customer-facing routing summary</div>
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
