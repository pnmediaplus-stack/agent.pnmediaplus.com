"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { StateBadge } from "@/components/shared/StateBadge";
import { useI18n } from "@/lib/i18n/useI18n";
import type {
  DepartmentHandoffContract,
  DepartmentPacksBundle,
  DepartmentRegistryBundle,
  DepartmentRegistryRecord
} from "@/lib/department-governance-loader";

type DepartmentGovernanceApiResponse = {
  ok: boolean;
  state: "ready" | "blocked";
  reason: string;
  bundle_version: string | null;
  bundle_fingerprint?: string;
  source_of_truth?: string;
  source_files?: Record<string, string>;
  data: {
    registry: DepartmentRegistryBundle;
    packs: DepartmentPacksBundle;
    handoff_contract: DepartmentHandoffContract;
    migration_sql_text: string;
    verification_queries_sql_text: string;
  } | null;
};

type DepartmentGovernanceViewProps = {
  response: DepartmentGovernanceApiResponse;
};

function asText(value: unknown, fallback: string) {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return fallback;
}

function asBooleanText(value: unknown, yes: string, no: string, fallback: string) {
  if (typeof value === "boolean") return value ? yes : no;
  return fallback;
}

function ReadonlyPanel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/70">
      <div className="border-b border-slate-700/80 bg-slate-900/60 px-5 py-4">
        <div className="text-sm font-semibold text-white">{title}</div>
        {description ? <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function ChipList({ values, emptyLabel }: { values: string[]; emptyLabel: string }) {
  if (!values.length) return <span className="text-slate-500">{emptyLabel}</span>;
  const visible = values.slice(0, 3);
  const overflow = values.length - visible.length;

  return (
    <div className="flex min-w-[14rem] flex-wrap gap-1.5">
      {visible.map((value) => (
        <span key={value} className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-300">
          {value}
        </span>
      ))}
      {overflow > 0 ? (
        <span className="rounded-full border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-400">+{overflow}</span>
      ) : null}
    </div>
  );
}

function KeyValueGrid({ rows }: { rows: { label: string; value: React.ReactNode }[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {rows.map((row) => (
        <div key={row.label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{row.label}</div>
          <div className="mt-2 break-words text-sm text-slate-200">{row.value}</div>
        </div>
      ))}
    </div>
  );
}

function CodeBlock({ title, text }: { title: string; text: string }) {
  return (
    <details className="rounded-xl border border-slate-800 bg-slate-950/80">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-100">{title}</summary>
      <pre className="max-h-[32rem] overflow-auto border-t border-slate-800 p-4 text-xs leading-5 text-slate-300">
        <code>{text}</code>
      </pre>
    </details>
  );
}

function SummaryStrip({
  t,
  response,
  pending
}: {
  t: (key: string) => string | undefined;
  response: DepartmentGovernanceApiResponse;
  pending: string;
}) {
  const sourceFiles = response.source_files ? Object.keys(response.source_files).length : 0;
  const phaseValue = response.data?.registry.registry_mode ? (t(`departmentGovernance.registryMode.${response.data.registry.registry_mode}`) ?? response.data.registry.registry_mode) : pending;

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t("departmentGovernance.summary.state") ?? "State"}</div>
        <div className="mt-2">
          <StateBadge
            label={response.state === "ready" ? "READY" : "BLOCKED"}
            displayLabel={response.state === "ready" ? (t("departmentGovernance.state.ready") ?? "Ready") : (t("departmentGovernance.state.blocked") ?? "Blocked")}
          />
        </div>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t("departmentGovernance.summary.source") ?? "Source"}</div>
        <div className="mt-2 text-sm text-slate-200">{response.source_of_truth ?? (t("departmentGovernance.placeholder.notProvided") ?? "Not provided")}</div>
        <div className="mt-1 text-xs text-slate-500">
          {response.source_files ? `${sourceFiles} ${t("departmentGovernance.summary.fileCount") ?? "files"}` : (t("departmentGovernance.placeholder.notProvided") ?? "Not provided")}
        </div>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t("departmentGovernance.summary.phase") ?? "Phase"}</div>
        <div className="mt-2 text-sm text-slate-200">{phaseValue}</div>
      </div>
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t("departmentGovernance.summary.reason") ?? "Reason"}</div>
        <div className="mt-2 text-sm text-slate-200">{response.reason || (t("departmentGovernance.placeholder.notProvided") ?? "Not provided")}</div>
      </div>
    </div>
  );
}

export function DepartmentGovernanceView({ response }: DepartmentGovernanceViewProps) {
  const { t } = useI18n("departmentGovernance");
  const pending = t("departmentGovernance.placeholder.pendingCanonicalInput") ?? "Pending canonical input";
  const stateLabel = response.state === "ready" ? "READY" : "BLOCKED";

  return (
    <div className="space-y-5">
      <PageHeader bannerKey="department_governance_banner"
        title={t("departmentGovernance.page.title") ?? "Department Governance"}
        purpose={t("departmentGovernance.page.purpose") ?? "Read-only admin view for the approved Department Governance bundle."}
        statusLabel={t("departmentGovernance.page.statusLabel") ?? "API status"}
        statusValue={stateLabel}
        statusDisplayValue={response.state === "ready" ? (t("departmentGovernance.state.ready") ?? "Ready") : (t("departmentGovernance.state.blocked") ?? "Blocked")}
        allowedActions={[
          t("departmentGovernance.page.allowed.viewRegistry") ?? "View registry",
          t("departmentGovernance.page.allowed.viewPacks") ?? "View packs",
          t("departmentGovernance.page.allowed.viewHandoff") ?? "View handoff contract"
        ]}
        forbiddenActions={[
          t("departmentGovernance.page.forbidden.editBundle") ?? "Edit bundle",
          t("departmentGovernance.page.forbidden.writeDatabase") ?? "Write database",
          t("departmentGovernance.page.forbidden.triggerRuntime") ?? "Trigger runtime"
        ]}
      />

      <ReadonlyPanel title={t("departmentGovernance.summary.title") ?? "Bundle summary"}>
        <SummaryStrip t={t} response={response} pending={pending} />
        {response.source_files ? (
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {t("departmentGovernance.summary.sourceFiles") ?? "Source files"}
            </div>
            <div className="mt-3 grid gap-2 text-sm text-slate-300">
              {Object.entries(response.source_files).map(([key, value]) => (
                <div key={key} className="grid gap-2 rounded-lg bg-slate-950/50 p-2 md:grid-cols-[14rem_1fr]">
                  <span className="font-mono text-xs text-cyan-200">{key}</span>
                  <span className="break-words font-mono text-xs text-slate-300">{value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </ReadonlyPanel>

      {response.state === "blocked" || !response.data ? (
        <ReadonlyPanel
          title={t("departmentGovernance.blocked.title") ?? "Department Governance bundle blocked"}
          description={t("departmentGovernance.blocked.description") ?? "The view fails closed because the API did not return a ready bundle."}
        >
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{response.reason}</div>
        </ReadonlyPanel>
      ) : (
        <>
          <RegistrySection registry={response.data.registry} pending={pending} />
          <PacksSection packs={response.data.packs} pending={pending} />
          <HandoffSection handoff={response.data.handoff_contract} pending={pending} />
          <TechnicalSection response={response} />
        </>
      )}
    </div>
  );
}

function RegistrySection({ registry, pending }: { registry: DepartmentRegistryBundle; pending: string }) {
  const { t } = useI18n("departmentGovernance");
  const records = registry.department_records;

  return (
    <ReadonlyPanel
      title={t("departmentGovernance.registry.title") ?? "Registry departments"}
      description={t("departmentGovernance.registry.description") ?? "Canonical department records from the approved bundle."}
    >
      <div className="mb-4">
        <KeyValueGrid
          rows={[
            { label: t("departmentGovernance.registry.registryId") ?? "Registry ID", value: registry.registry_id },
            { label: t("departmentGovernance.registry.registryStatus") ?? "Registry status", value: t(`departmentGovernance.registryStatus.${registry.registry_status}`) ?? registry.registry_status },
            { label: t("departmentGovernance.registry.registryMode") ?? "Registry mode", value: t(`departmentGovernance.registryMode.${registry.registry_mode}`) ?? registry.registry_mode }
          ]}
        />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1900px] divide-y divide-slate-800 text-left text-sm">
          <thead className="bg-slate-900/70 text-xs uppercase tracking-[0.18em] text-slate-400">
            <tr>
              {[
                "departmentId",
                "departmentName",
                "departmentPack",
                "ownerRole",
                "ownerTeam",
                "primaryPurpose",
                "canonicalTruthSource",
                "allowedActions",
                "mustNotActions",
                "dependencies",
                "downstreamRecipients",
                "currentState",
                "handoffRequired",
                "qaRequired",
                "humanReviewRequired"
              ].map((key) => (
                <th key={key} className="px-4 py-3">{t(`departmentGovernance.registry.${key}`) ?? key}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {records.map((record) => (
              <RegistryRow key={record.department_id} record={record} pending={pending} />
            ))}
          </tbody>
        </table>
      </div>
    </ReadonlyPanel>
  );
}

function RegistryRow({ record, pending }: { record: DepartmentRegistryRecord; pending: string }) {
  const { t } = useI18n("departmentGovernance");
  return (
    <tr className="align-top text-slate-300">
      <td className="px-4 py-4 font-mono text-xs text-cyan-200">{record.department_id}</td>
      <td className="px-4 py-4">{record.department_name}</td>
      <td className="px-4 py-4 font-mono text-xs">{record.department_pack}</td>
      <td className="px-4 py-4">{record.owner_role}</td>
      <td className="px-4 py-4">{record.owner_team}</td>
      <td className="px-4 py-4">{record.primary_purpose}</td>
      <td className="px-4 py-4">{record.canonical_truth_source}</td>
      <td className="px-4 py-4"><ChipList values={record.allowed_actions} emptyLabel={pending} /></td>
      <td className="px-4 py-4"><ChipList values={record.must_not_actions} emptyLabel={pending} /></td>
      <td className="px-4 py-4"><ChipList values={record.dependencies} emptyLabel={pending} /></td>
      <td className="px-4 py-4"><ChipList values={record.downstream_recipients} emptyLabel={pending} /></td>
      <td className="px-4 py-4">
        <StateBadge label={record.current_state} displayLabel={t(`departmentGovernance.currentState.${record.current_state}`) ?? record.current_state} />
      </td>
      <td className="px-4 py-4">{asBooleanText(record.handoff_required, t("departmentGovernance.boolean.yes") ?? "Yes", t("departmentGovernance.boolean.no") ?? "No", pending)}</td>
      <td className="px-4 py-4">{asBooleanText(record.qa_required, t("departmentGovernance.boolean.yes") ?? "Yes", t("departmentGovernance.boolean.no") ?? "No", pending)}</td>
      <td className="px-4 py-4">{asBooleanText(record.human_review_required, t("departmentGovernance.boolean.yes") ?? "Yes", t("departmentGovernance.boolean.no") ?? "No", pending)}</td>
    </tr>
  );
}

function PacksSection({ packs, pending }: { packs: DepartmentPacksBundle; pending: string }) {
  const { t } = useI18n("departmentGovernance");

  return (
    <ReadonlyPanel
      title={t("departmentGovernance.packs.title") ?? "Department packs"}
      description={t("departmentGovernance.packs.description") ?? "Read-only capability pack metadata for each department."}
    >
      <div className="mb-4 text-sm text-slate-400">
        {t("departmentGovernance.packs.version") ?? "Pack version"}: <span className="font-mono text-cyan-200">{packs.department_pack_version}</span>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        {Object.entries(packs.department_packs).map(([key, pack]) => (
          <div key={key} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="font-mono text-sm font-semibold text-cyan-200">{key}</div>
            <div className="mt-4 grid gap-3">
              <PackRow label={t("departmentGovernance.packs.owner") ?? "Owner"} values={pack.owner} pending={pending} />
              <PackRow label={t("departmentGovernance.packs.canonicalTruthSource") ?? "Canonical truth source"} values={pack.canonical_truth_source} pending={pending} />
              <PackRow label={t("departmentGovernance.packs.allowedActions") ?? "Allowed actions"} values={pack.allowed_actions} pending={pending} />
              <PackRow label={t("departmentGovernance.packs.mustNotActions") ?? "Must not actions"} values={pack.must_not_actions} pending={pending} />
              <PackRow label={t("departmentGovernance.packs.dependencies") ?? "Dependencies"} values={pack.dependencies} pending={pending} />
              <PackRow label={t("departmentGovernance.packs.handoffTo") ?? "Handoff to"} values={pack.handoff_to} pending={pending} />
              <div className="rounded-xl bg-slate-950/60 p-3">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{t("departmentGovernance.packs.qaExpectation") ?? "QA expectation"}</div>
                <div className="mt-2 text-sm text-slate-200">{pack.qa_expectation || pending}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ReadonlyPanel>
  );
}

function PackRow({ label, values, pending }: { label: string; values: string[]; pending: string }) {
  return (
    <div className="rounded-xl bg-slate-950/60 p-3">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2">
        <ChipList values={values} emptyLabel={pending} />
      </div>
    </div>
  );
}

function HandoffSection({ handoff, pending }: { handoff: DepartmentHandoffContract; pending: string }) {
  const { t } = useI18n("departmentGovernance");

  return (
    <ReadonlyPanel
      title={t("departmentGovernance.handoff.title") ?? "Handoff contract"}
      description={t("departmentGovernance.handoff.description") ?? "Canonical cross-department handoff contract rendered read-only."}
    >
      <KeyValueGrid
        rows={[
          { label: t("departmentGovernance.handoff.handoffType") ?? "Handoff type", value: t(`departmentGovernance.handoffType.${handoff.handoff_type}`) ?? handoff.handoff_type },
          { label: t("departmentGovernance.handoff.sourceDepartment") ?? "Source department", value: handoff.source_department },
          { label: t("departmentGovernance.handoff.targetDepartment") ?? "Target department", value: handoff.target_department },
          {
            label: t("departmentGovernance.handoff.currentState") ?? "Current state",
            value: <StateBadge label={handoff.current_state} displayLabel={t(`departmentGovernance.currentState.${handoff.current_state}`) ?? handoff.current_state} />
          },
          {
            label: t("departmentGovernance.handoff.requestedNextState") ?? "Requested next state",
            value: t(`departmentGovernance.currentState.${handoff.requested_next_state}`) ?? handoff.requested_next_state
          },
          {
            label: t("departmentGovernance.handoff.approvalRequired") ?? "Approval required",
            value: asBooleanText(handoff.approval_required, t("departmentGovernance.boolean.yes") ?? "Yes", t("departmentGovernance.boolean.no") ?? "No", pending)
          },
          {
            label: t("departmentGovernance.handoff.approvalStatus") ?? "Approval status",
            value: t(`departmentGovernance.approvalStatus.${handoff.approval_status}`) ?? handoff.approval_status
          },
          {
            label: t("departmentGovernance.handoff.qaRequired") ?? "QA required",
            value: asBooleanText(handoff.qa_required, t("departmentGovernance.boolean.yes") ?? "Yes", t("departmentGovernance.boolean.no") ?? "No", pending)
          },
          { label: t("departmentGovernance.handoff.qaStatus") ?? "QA status", value: t(`departmentGovernance.qaStatus.${handoff.qa_status}`) ?? handoff.qa_status },
          {
            label: t("departmentGovernance.handoff.publicSafe") ?? "Public safe",
            value: asBooleanText(handoff.public_safe, t("departmentGovernance.boolean.yes") ?? "Yes", t("departmentGovernance.boolean.no") ?? "No", pending)
          },
          { label: t("departmentGovernance.handoff.requestedDecision") ?? "Requested decision", value: handoff.requested_decision },
          { label: t("departmentGovernance.handoff.nextOwnerAction") ?? "Next owner action", value: handoff.next_owner_action }
        ]}
      />
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <PackRow label={t("departmentGovernance.handoff.nextActions") ?? "Next actions"} values={handoff.next_actions} pending={pending} />
        <PackRow label={t("departmentGovernance.handoff.requiredFields") ?? "Required handoff fields"} values={handoff.required_handoff_fields} pending={pending} />
      </div>
      <div className="mt-4">
        <CodeBlock title={t("departmentGovernance.handoff.integrationTargets") ?? "Integration targets"} text={JSON.stringify(handoff.integration_targets, null, 2)} />
      </div>
    </ReadonlyPanel>
  );
}

function TechnicalSection({ response }: { response: DepartmentGovernanceApiResponse }) {
  const { t } = useI18n("departmentGovernance");

  return (
    <ReadonlyPanel
      title={t("departmentGovernance.technical.title") ?? "Raw JSON / technical view"}
      description={t("departmentGovernance.technical.description") ?? "Read-only normalized bundle payload for traceability."}
    >
      <div className="grid gap-4">
        <CodeBlock title={t("departmentGovernance.technical.normalizedJson") ?? "Normalized JSON"} text={JSON.stringify(response.data, null, 2)} />
        <CodeBlock title={t("departmentGovernance.technical.migrationSql") ?? "Migration SQL text"} text={response.data?.migration_sql_text ?? ""} />
        <CodeBlock title={t("departmentGovernance.technical.verificationSql") ?? "Verification queries SQL text"} text={response.data?.verification_queries_sql_text ?? ""} />
      </div>
    </ReadonlyPanel>
  );
}
