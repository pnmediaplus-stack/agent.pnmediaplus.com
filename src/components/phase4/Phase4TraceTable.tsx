"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { StateBadge } from "@/components/shared/StateBadge";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Phase4ExecutionTrace } from "@/types/phase4";

type Phase4TraceTableProps = {
  traces: Phase4ExecutionTrace[];
};

function formatLatency(latencyMs: number | null, fallback: string) {
  if (typeof latencyMs !== "number") return fallback;
  if (latencyMs < 1000) return `${latencyMs}ms`;
  return `${(latencyMs / 1000).toFixed(2)}s`;
}

function formatNullableNumber(value: number | null, fallback: string) {
  return typeof value === "number" ? String(value) : fallback;
}

function formatNullableText(value: string | null, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function Phase4TraceTable({ traces }: Phase4TraceTableProps) {
  const { t } = useI18n("phase4");
  const pendingNotAvailable = t("phase4.common.pendingNotAvailable") ?? "Pending/N/A";

  if (!traces.length) {
    return (
      <EmptyState
        title={t("phase4.traces.empty.title") ?? "No execution traces"}
        description={t("phase4.traces.empty.description") ?? "Runtime read model is not available yet, so traces fail closed."}
      />
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/70">
      <div className="border-b border-slate-700/80 px-5 py-4">
        <div className="text-sm font-semibold text-white">{t("phase4.traces.title") ?? "Execution trace"}</div>
        <p className="mt-1 text-xs leading-5 text-slate-400">
          {t("phase4.traces.description") ?? "Trace every execution from request to receipt to terminal state."}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1540px] divide-y divide-slate-800 text-left text-sm">
          <thead className="bg-slate-900/70 text-xs uppercase tracking-[0.2em] text-slate-400">
            <tr>
              <th className="px-5 py-3">{t("phase4.traces.request") ?? "Request"}</th>
              <th className="px-5 py-3">{t("phase4.traces.workflow") ?? "Workflow"}</th>
              <th className="px-5 py-3">{t("phase4.traces.task") ?? "Task"}</th>
              <th className="px-5 py-3">{t("phase4.traces.receipt") ?? "Receipt"}</th>
              <th className="px-5 py-3">{t("phase4.traces.state") ?? "State"}</th>
              <th className="px-5 py-3">{t("phase4.traces.retry") ?? "Retry"}</th>
              <th className="px-5 py-3">{t("phase4.traces.maxAttempts") ?? "Max attempts"}</th>
              <th className="px-5 py-3">{t("phase4.traces.nextRetryAt") ?? "Next retry"}</th>
              <th className="px-5 py-3">{t("phase4.traces.retryPolicy") ?? "Retry policy"}</th>
              <th className="px-5 py-3">{t("phase4.traces.latency") ?? "Latency"}</th>
              <th className="px-5 py-3">{t("phase4.traces.queue") ?? "Queue"}</th>
              <th className="px-5 py-3">{t("phase4.traces.error") ?? "Error"}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {traces.map((trace) => (
              <tr key={trace.id} className="text-slate-300">
                <td className="px-5 py-4">{trace.requestRef}</td>
                <td className="px-5 py-4">{trace.workflowRef}</td>
                <td className="px-5 py-4">{trace.taskRef}</td>
                <td className="px-5 py-4">{trace.receiptRef}</td>
                <td className="px-5 py-4">
                  <StateBadge label={trace.currentState === "succeeded" ? "SUCCEEDED" : trace.currentState} displayLabel={t(`phase4.state.${trace.currentState}`) ?? trace.currentState} />
                </td>
                <td className="px-5 py-4">{t(`phase4.retry.${trace.retryState}`) ?? trace.retryState}</td>
                <td className="px-5 py-4">{formatNullableNumber(trace.maxAttempts, pendingNotAvailable)}</td>
                <td className="px-5 py-4">{formatNullableText(trace.nextRetryAt, pendingNotAvailable)}</td>
                <td className="px-5 py-4">{formatNullableText(trace.retryPolicyRef, pendingNotAvailable)}</td>
                <td className="px-5 py-4">{formatLatency(trace.latencyMs, t("phase4.common.pending") ?? "pending / incomplete")}</td>
                <td className="px-5 py-4">{trace.queueState}</td>
                <td className="px-5 py-4">{trace.errorSummary ?? (t("phase4.common.none") ?? "None")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
