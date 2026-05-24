"use client";

import { useEffect, useState } from "react";
import { StateBadge } from "@/components/shared/StateBadge";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Phase067Lead, Phase067LeadHistory, Phase067LeadSnapshot } from "@/lib/phase067-lead-loader";

type ApiResponse = {
  ok: boolean;
  state: "ready" | "blocked";
  reason: string;
  source_of_truth: string;
  data: Phase067LeadSnapshot | null;
  receivedAt: string;
};

function pending(t: (key: string) => string | undefined) {
  return t("lead.value.pending") ?? "Pending / N/A";
}

function asText(value: string | number | null | undefined, t: (key: string) => string | undefined) {
  if (typeof value === "number") return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return pending(t);
}

function ChipList({ values }: { values: string[] }) {
  const { t } = useI18n("phase067");

  if (!values.length) {
    return <span className="text-slate-500">{pending(t)}</span>;
  }

  return (
    <div className="flex min-w-[12rem] flex-wrap gap-1.5">
      {values.slice(0, 4).map((value) => (
        <span key={value} className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300">
          {value}
        </span>
      ))}
      {values.length > 4 ? (
        <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-400">
          +{values.length - 4}
        </span>
      ) : null}
    </div>
  );
}

function MetricCard({ label, value, tone = "slate" }: { label: string; value: string; tone?: "slate" | "rose" | "amber" }) {
  const toneClass =
    tone === "rose"
      ? "border-rose-400/25 bg-rose-400/10 text-rose-100"
      : tone === "amber"
        ? "border-amber-400/25 bg-amber-400/10 text-amber-100"
        : "border-slate-800 bg-slate-900/60 text-slate-100";

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/75">
      <div className="border-b border-slate-800 bg-slate-900/60 px-5 py-4">
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="mt-1 text-xs leading-5 text-slate-400">{description}</div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function LeadsTable({ leads }: { leads: Phase067Lead[] }) {
  const { t } = useI18n("phase067");

  if (!leads.length) {
    return <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">{t("lead.empty.leads") ?? "No leads returned by the read surface."}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1500px] divide-y divide-slate-800 text-left text-sm">
        <thead className="bg-slate-900/70 text-xs uppercase tracking-[0.18em] text-slate-400">
          <tr>
            {[
              "leadId",
              "stage",
              "status",
              "owner",
              "customer",
              "source",
              "claimBoundary",
              "qaBoundary",
              "evidence",
              "escalation",
              "history",
              "updated"
            ].map((key) => (
              <th key={key} className="px-4 py-3">{t(`lead.table.${key}`) ?? key}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {leads.map((lead, index) => (
            <tr key={lead.lead_id ?? `${lead.source_ref}:${index}`} className="align-top text-slate-300">
              <td className="px-4 py-4 font-mono text-xs text-cyan-200">{asText(lead.lead_id, t)}</td>
              <td className="px-4 py-4">
                <StateBadge label={lead.stage ?? "PENDING"} displayLabel={asText(lead.stage, t)} />
              </td>
              <td className="px-4 py-4">
                <StateBadge label={lead.status ?? "PENDING"} displayLabel={asText(lead.status, t)} />
              </td>
              <td className="px-4 py-4">{asText(lead.owner_ref, t)}</td>
              <td className="px-4 py-4">{asText(lead.customer_ref, t)}</td>
              <td className="px-4 py-4">
                <div>{asText(lead.source_channel, t)}</div>
                <div className="mt-1 font-mono text-xs text-slate-500">{asText(lead.source_ref, t)}</div>
              </td>
              <td className="px-4 py-4">{asText(lead.claim_boundary, t)}</td>
              <td className="px-4 py-4">{asText(lead.qa_boundary, t)}</td>
              <td className="px-4 py-4"><ChipList values={lead.evidence_refs} /></td>
              <td className="px-4 py-4"><ChipList values={lead.escalation_path} /></td>
              <td className="px-4 py-4">{asText(lead.history_count, t)}</td>
              <td className="px-4 py-4">{asText(lead.updated_at ?? lead.latest_event_at, t)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HistoryTable({ history }: { history: Phase067LeadHistory[] }) {
  const { t } = useI18n("phase067");

  if (!history.length) {
    return <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">{t("lead.empty.history") ?? "No lead history returned by the read surface."}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[1300px] divide-y divide-slate-800 text-left text-sm">
        <thead className="bg-slate-900/70 text-xs uppercase tracking-[0.18em] text-slate-400">
          <tr>
            {["leadId", "eventType", "actor", "stage", "status", "requestId", "eventHash", "created"].map((key) => (
              <th key={key} className="px-4 py-3">{t(`lead.history.${key}`) ?? key}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {history.map((item, index) => (
            <tr key={item.event_hash ?? `${item.lead_id}:${index}`} className="align-top text-slate-300">
              <td className="px-4 py-4 font-mono text-xs text-cyan-200">{asText(item.lead_id, t)}</td>
              <td className="px-4 py-4">{asText(item.event_type, t)}</td>
              <td className="px-4 py-4">
                <div>{asText(item.actor_type, t)}</div>
                <div className="mt-1 font-mono text-xs text-slate-500">{asText(item.actor_ref, t)}</div>
              </td>
              <td className="px-4 py-4">{asText(item.stage, t)}</td>
              <td className="px-4 py-4">{asText(item.status, t)}</td>
              <td className="px-4 py-4 font-mono text-xs">{asText(item.request_id, t)}</td>
              <td className="px-4 py-4 font-mono text-xs">{asText(item.event_hash, t)}</td>
              <td className="px-4 py-4">{asText(item.created_at, t)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Phase067LeadIntakeView() {
  const { t } = useI18n("phase067");
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const result = await fetch("/api/phase067/leads", {
          method: "GET",
          cache: "no-store",
          credentials: "include"
        });
        const payload = (await result.json().catch(() => null)) as ApiResponse | null;
        if (active) {
          setResponse(
            payload ?? {
              ok: false,
              state: "blocked",
              reason: "PHASE067_LEAD_API_INVALID_RESPONSE",
              source_of_truth: "public.phase067_leads + public.phase067_lead_snapshot()",
              data: null,
              receivedAt: new Date().toISOString()
            }
          );
        }
      } catch (error) {
        if (active) {
          setResponse({
            ok: false,
            state: "blocked",
            reason: error instanceof Error ? error.message : String(error),
            source_of_truth: "public.phase067_leads + public.phase067_lead_snapshot()",
            data: null,
            receivedAt: new Date().toISOString()
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <Panel title={t("lead.loading.title") ?? "Loading lead intake"} description={t("lead.loading.description") ?? "Reading the approved Phase 067 public snapshot."}>
        <div className="h-28 animate-pulse rounded-xl border border-slate-800 bg-slate-900/60" />
      </Panel>
    );
  }

  if (!response || response.state === "blocked" || !response.data) {
    return (
      <Panel title={t("lead.blocked.title") ?? "Lead intake blocked"} description={t("lead.blocked.description") ?? "The view fails closed because the approved read surface is not ready."}>
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          {response?.reason ?? (t("lead.value.pending") ?? "Pending / N/A")}
        </div>
      </Panel>
    );
  }

  const { summary, leads, lead_history: history } = response.data;

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard label={t("lead.metric.total") ?? "Total leads"} value={asText(summary.lead_count, t)} />
        <MetricCard label={t("lead.metric.blocked") ?? "Blocked"} value={asText(summary.blocked_count, t)} tone="rose" />
        <MetricCard label={t("lead.metric.escalated") ?? "Escalated"} value={asText(summary.escalated_count, t)} tone="amber" />
      </div>

      <Panel title={t("lead.panel.leads.title") ?? "Lead intake"} description={t("lead.panel.leads.description") ?? "Read-only lead funnel rows from public.phase067_leads."}>
        <LeadsTable leads={leads} />
      </Panel>

      <Panel title={t("lead.panel.history.title") ?? "Lead history"} description={t("lead.panel.history.description") ?? "Append-only history projection from public.phase067_lead_snapshot()."}>
        <HistoryTable history={history} />
      </Panel>

      <Panel title={t("lead.panel.source.title") ?? "Source trace"} description={t("lead.panel.source.description") ?? "Read-only public surface used by this dashboard."}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t("lead.source.truth") ?? "Source of truth"}</div>
            <div className="mt-2 break-words font-mono text-xs text-cyan-200">{response.source_of_truth}</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t("lead.source.receivedAt") ?? "Received at"}</div>
            <div className="mt-2 break-words text-sm text-slate-200">{response.receivedAt}</div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
