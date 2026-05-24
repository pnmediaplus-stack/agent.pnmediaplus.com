"use client";

import { FormEvent, useEffect, useState } from "react";
import { StateBadge } from "@/components/shared/StateBadge";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Phase070ProviderCatalogItem, Phase070TenantIntegrationStatus } from "@/lib/tenant-integrations";

type TenantIntegrationsResponse = {
  ok: boolean;
  state: "ready" | "blocked";
  reason: string;
  data: {
    organization: {
      organization_name: string;
      organization_key: string;
      role: string;
    };
    providers: Phase070ProviderCatalogItem[];
    integrations: Phase070TenantIntegrationStatus[];
  } | null;
};

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

function MetadataRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 break-words text-sm text-slate-200">{value}</div>
    </div>
  );
}

export function TenantIntegrationsView() {
  const { t } = useI18n("phase070");
  const [response, setResponse] = useState<TenantIntegrationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [blockedReceipt, setBlockedReceipt] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const result = await fetch("/api/tenant-integrations", {
        method: "GET",
        cache: "no-store",
        credentials: "include"
      });
      const payload = (await result.json().catch(() => null)) as TenantIntegrationsResponse | null;
      setResponse(
        payload ?? {
          ok: false,
          state: "blocked",
          reason: "PHASE070_INVALID_RESPONSE",
          data: null
        }
      );
    } catch (error) {
      setResponse({
        ok: false,
        state: "blocked",
        reason: error instanceof Error ? error.message : String(error),
        data: null
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submitWriteOnlySecret(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      provider_code: formData.get("provider_code"),
      integration_key: formData.get("integration_key"),
      integration_name: formData.get("integration_name"),
      secret_material: formData.get("secret_material") ? "__WRITE_ONLY_SECRET_SUBMITTED__" : ""
    };

    const result = await fetch("/api/tenant-integrations", {
      method: "POST",
      cache: "no-store",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    const body = await result.json().catch(() => ({}));
    setBlockedReceipt(typeof body?.data?.receipt?.receipt_ref === "string" ? body.data.receipt.receipt_ref : "phase070:create:blocked");
    form.reset();
  }

  if (loading) {
    return (
      <Panel title={t("loading.title") ?? "Loading tenant integrations"} description={t("loading.description") ?? "Reading provider catalog and tenant integration metadata."}>
        <div className="h-32 animate-pulse rounded-xl border border-slate-800 bg-slate-900/60" />
      </Panel>
    );
  }

  if (!response?.data) {
    return (
      <Panel title={t("blocked.title") ?? "Tenant integrations blocked"} description={t("blocked.description") ?? "Phase 070 fails closed until portal session, membership, and read surfaces are ready."}>
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-100">{response?.reason ?? "PHASE070_BLOCKED"}</div>
      </Panel>
    );
  }

  return (
    <div className="grid gap-7">
      <div className="grid gap-3 md:grid-cols-3">
        <MetadataRow label={t("summary.organization") ?? "Organization"} value={response.data.organization.organization_name} />
        <MetadataRow label={t("summary.role") ?? "Role"} value={response.data.organization.role} />
        <MetadataRow label={t("summary.mode") ?? "Mode"} value={t("summary.modeValue") ?? "Metadata only / write operations blocked"} />
      </div>

      <Panel title={t("providers.title") ?? "Provider catalog"} description={t("providers.description") ?? "Read-only provider catalog. No provider secrets are exposed."}>
        <div className="grid gap-4 xl:grid-cols-3">
          {response.data.providers.map((provider) => (
            <article key={provider.provider_code} className="rounded-2xl border border-slate-800 bg-slate-900/55 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-xs text-cyan-200">{provider.provider_code}</div>
                  <h3 className="mt-2 text-base font-semibold text-white">{provider.provider_name}</h3>
                  <div className="mt-1 text-xs text-slate-500">{provider.provider_category} / {provider.auth_type}</div>
                </div>
                <StateBadge label={provider.status} displayLabel={provider.status} />
              </div>
              <div className="mt-4 grid gap-2">
                {provider.capabilities.length ? provider.capabilities.map((capability) => (
                  <div key={String(capability)} className="rounded-lg bg-slate-950/55 px-3 py-2 text-xs text-slate-300">{String(capability)}</div>
                )) : (
                  <div className="rounded-lg bg-slate-950/55 px-3 py-2 text-xs text-slate-500">{t("providers.noCapabilities") ?? "No public capabilities listed"}</div>
                )}
              </div>
            </article>
          ))}
        </div>
      </Panel>

      <Panel title={t("integrations.title") ?? "Tenant integration status"} description={t("integrations.description") ?? "Metadata/status only. Secret blobs and receipts are not exposed through this surface."}>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="px-3 py-2">{t("integrations.provider") ?? "Provider"}</th>
                <th className="px-3 py-2">{t("integrations.integration") ?? "Integration"}</th>
                <th className="px-3 py-2">{t("integrations.status") ?? "Status"}</th>
                <th className="px-3 py-2">{t("integrations.connection") ?? "Connection"}</th>
                <th className="px-3 py-2">{t("integrations.credential") ?? "Credential"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {response.data.integrations.map((integration) => (
                <tr key={`${integration.organization_id}:${integration.integration_key}`}>
                  <td className="px-3 py-3">{integration.provider_name}</td>
                  <td className="px-3 py-3">
                    <div className="font-semibold text-white">{integration.integration_name}</div>
                    <div className="font-mono text-xs text-slate-500">{integration.integration_key}</div>
                  </td>
                  <td className="px-3 py-3"><StateBadge label={integration.status} displayLabel={integration.status} /></td>
                  <td className="px-3 py-3"><StateBadge label={integration.connection_state} displayLabel={integration.connection_state} /></td>
                  <td className="px-3 py-3">{integration.credential_configured ? (t("integrations.credentialConfigured") ?? "Configured") : (t("integrations.credentialMissing") ?? "Missing")}</td>
                </tr>
              ))}
              {!response.data.integrations.length ? (
                <tr>
                  <td className="px-3 py-6 text-slate-500" colSpan={5}>{t("integrations.empty") ?? "No tenant integrations configured."}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title={t("writeOnly.title") ?? "Write-only secret intake"} description={t("writeOnly.description") ?? "This form does not display, store, or echo raw secrets in the browser. Runtime writes remain blocked until Gatekeeper approves encryption authority."}>
        <form className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1.2fr_auto]" onSubmit={submitWriteOnlySecret}>
          <input name="provider_code" className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100" placeholder={t("writeOnly.provider") ?? "provider_code"} />
          <input name="integration_key" className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100" placeholder={t("writeOnly.key") ?? "integration_key"} />
          <input name="integration_name" className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100" placeholder={t("writeOnly.name") ?? "Integration name"} />
          <input name="secret_material" type="password" autoComplete="off" className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100" placeholder={t("writeOnly.secret") ?? "Write-only secret"} />
          <button type="submit" className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-400/15">
            {t("writeOnly.submit") ?? "Submit blocked receipt"}
          </button>
        </form>
        {blockedReceipt ? (
          <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
            {t("writeOnly.blockedReceipt") ?? "Blocked receipt"}: {blockedReceipt}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
