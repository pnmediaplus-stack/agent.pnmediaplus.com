"use client";

import { useEffect, useState } from "react";
import { StateBadge } from "@/components/shared/StateBadge";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Phase068ProductPortalCore } from "@/lib/phase068-product-portal-core";

type ApiResponse = {
  ok: boolean;
  state: "ready" | "blocked";
  reason: string;
  source_of_truth: string;
  data: Phase068ProductPortalCore | null;
  receivedAt: string;
};

function text(value: string | number | boolean | null | undefined, fallback: string) {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string" && value.trim()) return value;
  return fallback;
}

function Panel({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/75">
      <div className="border-b border-slate-800 bg-slate-900/60 px-6 py-5">
        <div className="text-sm font-semibold text-white">{title}</div>
        <div className="mt-1 text-xs leading-5 text-slate-400">{description}</div>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function KeyValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</div>
      <div className="mt-2 break-words text-sm text-slate-200">{value}</div>
    </div>
  );
}

function BoundaryList({ label, items }: { label: string; items: string[] }) {
  const { t } = useI18n("phase068");
  const fallback = t("portal.value.pending") ?? "Pending / N/A";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 grid gap-1.5">
        {(items.length ? items : [fallback]).map((item) => (
          <div key={item} className="rounded-lg bg-slate-900/60 px-2.5 py-1.5 text-xs leading-5 text-slate-300">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export function Phase068ProductPortalView() {
  const { t } = useI18n("phase068");
  const fallback = t("portal.value.pending") ?? "Pending / N/A";
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const result = await fetch("/api/phase068/portal-core", {
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
              reason: "PHASE068_PORTAL_CORE_INVALID_RESPONSE",
              source_of_truth: "Phase 068 portal core",
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
            source_of_truth: "Phase 068 portal core",
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
      <Panel title={t("portal.loading.title") ?? "Loading Product Portal"} description={t("portal.loading.description") ?? "Reading identity and tenant context safely."}>
        <div className="h-32 animate-pulse rounded-xl border border-slate-800 bg-slate-900/60" />
      </Panel>
    );
  }

  if (!response?.data) {
    return (
      <Panel title={t("portal.blocked.title") ?? "Product Portal blocked"} description={t("portal.blocked.description") ?? "The portal core fails closed until identity and tenant context are available."}>
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">
          {response?.reason ?? fallback}
        </div>
      </Panel>
    );
  }

  const core = response.data;

  return (
    <div className="grid gap-7">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KeyValue label={t("portal.summary.state") ?? "State"} value={<StateBadge label={core.state} displayLabel={core.state} />} />
        <KeyValue label={t("portal.summary.wordpress") ?? "WordPress"} value={text(core.wordpress_out_of_scope, fallback)} />
        <KeyValue label={t("portal.summary.signup") ?? "Public signup"} value={text(core.public_signup_allowed, fallback)} />
        <KeyValue label={t("portal.summary.authority") ?? "Authority"} value={text(core.authority_granted, fallback)} />
      </div>

      <Panel title={t("portal.shell.title") ?? "Identity / tenant shell"} description={t("portal.shell.description") ?? "One compact read-only shell for user identity and active organization context."}>
        <div className="grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t("portal.identity.title") ?? "Identity shell"}</div>
                <div className="mt-2 text-sm font-semibold text-white">{text(core.identity_shell.email, fallback)}</div>
              </div>
              <StateBadge label={core.identity_shell.state} displayLabel={core.identity_shell.state} />
            </div>
            <div className="mt-3 break-all font-mono text-xs text-slate-500">{text(core.identity_shell.user_id, fallback)}</div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{t("portal.tenant.title") ?? "Tenant shell"}</div>
                <div className="mt-2 text-sm font-semibold text-white">{text(core.tenant_shell.active_organization_name, fallback)}</div>
              </div>
              <StateBadge label={core.tenant_shell.state} displayLabel={core.tenant_shell.state} />
            </div>
            <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-3">
              <div>{t("portal.tenant.role") ?? "Role"}: {text(core.tenant_shell.active_role, fallback)}</div>
              <div>{t("portal.tenant.memberships") ?? "Memberships"}: {text(core.tenant_shell.memberships_count, fallback)}</div>
              <div className="truncate">{t("portal.tenant.organizationId") ?? "Organization ID"}: {text(core.tenant_shell.active_organization_id, fallback)}</div>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title={t("portal.catalog.title") ?? "Package catalog"} description={t("portal.catalog.description") ?? "Read-only package catalog. Activation requires explicit review."}>
        <div className="grid gap-5 xl:grid-cols-3 xl:auto-rows-fr">
          {core.package_catalog.map((item) => (
            <article key={item.package_id} className="flex h-full flex-col rounded-2xl border border-slate-800 bg-slate-900/55 p-4 shadow-xl shadow-slate-950/20">
              <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <div className="font-mono text-[11px] text-cyan-200">{item.package_id}</div>
                  <h3 className="mt-2 text-base font-semibold text-white">{item.package_name}</h3>
                  <div className="mt-1 inline-flex rounded-full border border-slate-700 px-2 py-0.5 text-[11px] text-slate-400">{item.version}</div>
                </div>
                <StateBadge label={item.package_state} displayLabel={item.package_state} />
              </div>
              <div className="mt-4 flex flex-1 flex-col gap-3 text-sm text-slate-300">
                <div className="leading-6 text-slate-300">{item.solution_boundary}</div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-3 font-mono text-xs">{item.deployment_template_ref}</div>
                <div className="grid gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-200">{t("portal.catalog.activation") ?? "Activation"}</div>
                    <div className="mt-1 text-sm font-semibold text-cyan-50">{item.activation_status}</div>
                  </div>
                  <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">{t("portal.catalog.supportTier") ?? "Support tier"}</div>
                    <div className="mt-1 text-sm text-slate-200">{item.support_tier}</div>
                  </div>
                </div>
                <KeyValue label={t("portal.catalog.license") ?? "License"} value={item.license_boundary} />
                <BoundaryList label={t("portal.catalog.included") ?? "Included"} items={item.included_surfaces} />
                <BoundaryList label={t("portal.catalog.excluded") ?? "Excluded"} items={item.excluded_surfaces} />
                <KeyValue label={t("portal.catalog.escalation") ?? "Escalation"} value={item.escalation_boundary} />
                <KeyValue label={t("portal.catalog.billing") ?? "Billing"} value={item.billing_boundary} />
              </div>
            </article>
          ))}
        </div>
      </Panel>

      <Panel title={t("portal.workspace.title") ?? "Workspace scaffold"} description={t("portal.workspace.description") ?? "Customer workspace scaffold remains isolated by organization."}>
        {core.workspace_scaffold ? (
          <div className="grid gap-3 md:grid-cols-3">
            <KeyValue label={t("portal.workspace.id") ?? "Workspace ID"} value={core.workspace_scaffold.workspace_id} />
            <KeyValue label={t("portal.workspace.organization") ?? "Organization"} value={core.workspace_scaffold.organization_name} />
            <KeyValue label={t("portal.workspace.reason") ?? "Reason"} value={core.workspace_scaffold.reason} />
          </div>
        ) : (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{core.blocker ?? fallback}</div>
        )}
      </Panel>

      <Panel title={t("portal.workspaceFlow.title") ?? "Workspace / tenant flow"} description={t("portal.workspaceFlow.description") ?? "Read-only onboarding flow. Missing data stays blocked and no workspace is created from this UI."}>
        <div className="grid gap-3 xl:grid-cols-3">
          {core.workspace_flow.map((step) => (
            <article key={step.step_id} className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-mono text-xs text-cyan-200">{step.step_id}</div>
                  <div className="mt-2 text-sm font-semibold text-white">{step.owner}</div>
                </div>
                <StateBadge label={step.state} displayLabel={step.state} />
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">{step.description}</p>
            </article>
          ))}
        </div>
      </Panel>

      <Panel title={t("portal.licenseSupport.title") ?? "License / support boundary"} description={t("portal.licenseSupport.description") ?? "Commercial and support edges are visible only. No billing, license issuance, or support mutation is opened."}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <KeyValue label={t("portal.licenseSupport.state") ?? "State"} value={<StateBadge label={core.license_support_boundary.state} displayLabel={core.license_support_boundary.state} />} />
          <KeyValue label={t("portal.licenseSupport.licenseModel") ?? "License model"} value={core.license_support_boundary.license_model} />
          <KeyValue label={t("portal.licenseSupport.supportModel") ?? "Support model"} value={core.license_support_boundary.support_model} />
          <KeyValue label={t("portal.licenseSupport.escalation") ?? "Escalation"} value={core.license_support_boundary.escalation_boundary} />
          <KeyValue label={t("portal.licenseSupport.billing") ?? "Billing"} value={core.license_support_boundary.billing_boundary} />
          <KeyValue label={t("portal.licenseSupport.activation") ?? "Activation"} value={core.license_support_boundary.activation_boundary} />
        </div>
      </Panel>

      <Panel title={t("portal.stop.title") ?? "Stop conditions"} description={t("portal.stop.description") ?? "Blocked states are visible and never auto-corrected."}>
        <div className="grid gap-2">
          {core.stop_conditions.map((condition) => (
            <div key={condition.condition_id} className="grid gap-2 rounded-xl border border-slate-800 bg-slate-900/55 p-3 md:grid-cols-[16rem_8rem_1fr]">
              <span className="font-mono text-xs text-cyan-200">{condition.condition_id}</span>
              <StateBadge label={condition.triggered ? "blocked" : "ready"} displayLabel={condition.triggered ? "blocked" : "ready"} />
              <span className="text-sm text-slate-300">{condition.message}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
