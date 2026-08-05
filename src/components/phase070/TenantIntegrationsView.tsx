"use client";

import { FormEvent, useEffect, useState } from "react";
import { StateBadge } from "@/components/shared/StateBadge";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Phase070ProviderCatalogItem, Phase070TenantIntegrationStatus } from "@/lib/tenant-integrations";
import { IntegrationCard } from "@/components/ui/IntegrationCard";
import { ConnectedAccountRow } from "./ConnectedAccountRow";

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

type TenantIntegrationActionResponse = {
  ok: boolean;
  state: "ready" | "blocked";
  reason: string;
  data?: {
    receipt?: {
      receipt_ref?: string;
      receipt_state?: string;
      redaction_status?: string;
      broker_status?: string;
    };
  };
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

import { createTenantIntegration, rotateTenantIntegration, revokeTenantIntegration, issueReferenceToken, type VaultActionResponse } from "@/app/actions/vault-actions";

export function TenantIntegrationsView() {
  const { t } = useI18n("phase070");
  const [response, setResponse] = useState<TenantIntegrationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [operationResult, setOperationResult] = useState<TenantIntegrationActionResponse | null>(null);

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

  async function executeAction(operation: string, actionFn: () => Promise<VaultActionResponse>) {
    setActionLoading(operation);
    setOperationResult(null);
    try {
      const result = await actionFn();
      setOperationResult(result as TenantIntegrationActionResponse);
      await load();
    } catch (error) {
      setOperationResult({
        ok: false,
        state: "blocked",
        reason: error instanceof Error ? error.message : String(error)
      });
    } finally {
      setActionLoading(null);
    }
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    
    const providerCode = String(formData.get("provider_code") || "");
    const pageId = String(formData.get("page_id") || "").trim();
    
    let integrationKey = String(formData.get("integration_key") || "");
    if (!integrationKey) {
        if (providerCode === "facebook_page" && pageId) {
            integrationKey = `${providerCode}_${pageId}`;
        } else {
            integrationKey = `${providerCode}_${Date.now()}`;
        }
    }

    const providerName = response?.data?.providers.find(p => p.provider_code === providerCode)?.provider_name || providerCode;
    let integrationName = String(formData.get("integration_name") || "");
    if (!integrationName) {
        integrationName = `${providerName} Chính thức`;
    }

    const accessToken = String(formData.get("secret_material") || "").trim();

    let existingIntegration = response?.data?.integrations.find(i => i.integration_key === integrationKey);

    if (existingIntegration) {
      await executeAction(providerCode, () => 
        rotateTenantIntegration(integrationKey, accessToken, pageId)
      );
    } else {
      await executeAction(providerCode, async () => {
        let result = await createTenantIntegration(providerCode, integrationKey, integrationName, accessToken, pageId);
        if (!result.ok && result.reason && result.reason.includes("ALREADY_EXISTS")) {
           // Fallback to rotate if it exists but was hidden from the view
           result = await rotateTenantIntegration(integrationKey, accessToken, pageId);
        }
        return result;
      });
    }
    form.reset();
  }

  async function submitRotateSecret(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const integrationKey = String(formData.get("integration_key") ?? "").trim();
    if (!integrationKey) {
      setOperationResult({ ok: false, state: "blocked", reason: "PHASE074_INTEGRATION_KEY_REQUIRED" });
      return;
    }
    const providerCode = String(formData.get("provider_code") || "");
    const accessToken = String(formData.get("secret_material") || "").trim();
    const pageId = String(formData.get("page_id") || "").trim();

    await executeAction(providerCode, () => 
      rotateTenantIntegration(integrationKey, accessToken, pageId)
    );
    form.reset();
  }

  async function submitRevoke(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const integrationKey = String(formData.get("integration_key") ?? "").trim();
    if (!integrationKey) {
      setOperationResult({ ok: false, state: "blocked", reason: "PHASE074_INTEGRATION_KEY_REQUIRED" });
      return;
    }
    const providerCode = String(formData.get("provider_code") || "revoke");
    await executeAction(providerCode, () => 
      revokeTenantIntegration(integrationKey)
    );
  }

  async function submitBrokerCall(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const integrationKey = String(formData.get("integration_key") ?? "").trim();
    if (!integrationKey) {
      setOperationResult({ ok: false, state: "blocked", reason: "PHASE074_INTEGRATION_KEY_REQUIRED" });
      return;
    }
    const providerCode = String(formData.get("provider_code") || "test");
    await executeAction(providerCode, () =>
      issueReferenceToken(integrationKey, providerCode)
    );
  }

  if (loading) {
    return (
      <Panel title={t("phase070.loading.title") ?? "Đang tải tích hợp khách hàng"} description={t("phase070.loading.description") ?? "Đang đọc danh mục nhà cung cấp và siêu dữ liệu tích hợp của khách hàng."}>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
             <div key={i} className="h-64 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/60" />
          ))}
        </div>
      </Panel>
    );
  }

  if (!response?.data) {
    return (
      <Panel title={t("phase070.blocked.title") ?? "Tích hợp khách hàng bị chặn"} description={t("phase070.blocked.description") ?? "Phase 070 đóng cho đến khi phiên cổng, thành viên và bề mặt đọc sẵn sàng."}>
        <div className="rounded-xl border border-rose-900/50 bg-rose-950/30 p-6">
          <div className="text-sm font-medium text-rose-400">Response State: {response?.state ?? "Unknown"}</div>
          <div className="mt-2 text-sm text-slate-300">Reason: {response?.reason ?? "No data received from API"}</div>
        </div>
      </Panel>
    );
  }

  const { organization, providers, integrations } = response.data;
  const activeIntegrations = integrations.filter(i => i.credential_configured && i.status !== 'revoked');

  return (
    <div className="space-y-8">
      {/* Operation Feedback */}
      {operationResult && (
        <div className={`rounded-xl border p-4 ${operationResult.state === "ready" ? "border-emerald-900/50 bg-emerald-950/30" : "border-rose-900/50 bg-rose-950/30"}`}>
          <div className="flex items-center space-x-3">
            <StateBadge label={operationResult.state === "ready" ? "pass" : "blocked"} displayLabel={operationResult.state} />
            <div className={`text-sm font-medium ${operationResult.state === "ready" ? "text-emerald-400" : "text-rose-400"}`}>
              {operationResult.state === "ready" ? "Thao tác thành công" : "Thao tác thất bại"}
            </div>
          </div>
          <div className="mt-1 text-sm text-slate-400">Lý do: {operationResult.reason}</div>
          {operationResult.data?.receipt && (
            <div className="mt-3 text-xs text-slate-500 font-mono space-y-1">
               <p>Biên lai mã hóa: {operationResult.data.receipt.receipt_ref}</p>
               <p>Trạng thái Broker: {operationResult.data.receipt.broker_status}</p>
            </div>
          )}
        </div>
      )}

      {/* Tenant Context */}
      <Panel title={t("phase070.summary.organization") ?? "Ngữ cảnh tổ chức"} description={t("phase070.summary.modeValue") ?? "Các claims được xác thực từ phiên cổng đang hoạt động"}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetadataRow label="Organization Name" value={organization.organization_name} />
          <MetadataRow label="Organization Key" value={organization.organization_key} />
          <MetadataRow label="Role" value={organization.role} />
        </div>
      </Panel>

      {/* Connected Accounts Dashboard */}
      {activeIntegrations.length > 0 && (
        <section className="mb-8">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-100">{t("phase070.dashboard.title") ?? "Bảng Tổng Quan Fanpage & Tích Hợp"}</h2>
            <p className="mt-1 text-sm text-slate-400">{t("phase070.dashboard.description") ?? "Quản lý trạng thái kết nối và thay đổi cấu hình mã truy cập."}</p>
          </div>
          <div className="space-y-3">
            {activeIntegrations.map((integration) => {
              const provider = providers.find((p) => p.provider_code === integration.provider_code);
              if (!provider) return null;
              return (
                <ConnectedAccountRow
                  key={integration.integration_key}
                  provider={provider}
                  integration={integration}
                  actionLoading={actionLoading}
                  onRotate={async (integrationKey, secretMaterial, pageId) => {
                    await executeAction(provider.provider_code, () =>
                      rotateTenantIntegration(integrationKey, secretMaterial, pageId)
                    );
                  }}
                  onRevoke={async (integrationKey) => {
                    await executeAction(provider.provider_code, () =>
                      revokeTenantIntegration(integrationKey)
                    );
                  }}
                  onTest={async (integrationKey) => {
                    await executeAction(provider.provider_code, () =>
                      issueReferenceToken(integrationKey, provider.provider_code)
                    );
                  }}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Dynamic Catalog */}
      <section>
        <div className="mb-6">
           <h2 className="text-xl font-semibold text-slate-100">{t("phase070.providers.title") ?? "Danh mục nhà cung cấp AI"}</h2>
           <p className="mt-1 text-sm text-slate-400">{t("phase070.writeOnly.description") ?? "Cấu hình quyền truy cập BYOK (Bring Your Own Key) cho khách hàng của bạn. Bí mật chỉ ghi và được lưu trữ ngay lập tức."}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {providers.map((provider) => {
             const providerIntegrations = activeIntegrations.filter(i => i.provider_code === provider.provider_code);
             
             // Only show the 'Add New' card if the provider supports multiple (e.g. facebook) OR if it has 0 integrations
             if (providerIntegrations.length === 0 || provider.provider_code === "facebook_page") {
                return (
                  <IntegrationCard 
                    key={`${provider.provider_code}_new`}
                    provider={provider}
                    integration={undefined}
                    actionLoading={actionLoading}
                    onSubmitCreate={submitCreate}
                    onSubmitRotate={submitRotateSecret}
                    onSubmitRevoke={submitRevoke}
                    onSubmitTest={submitBrokerCall}
                  />
                );
             }
             return null;
          })}
        </div>
        {providers.length === 0 && (
           <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-12 text-center">
              <p className="text-sm text-slate-400">{t("phase070.providers.noCapabilities") ?? "Không tìm thấy nhà cung cấp AI đang hoạt động nào trong danh mục."}</p>
           </div>
        )}
      </section>
    </div>
  );
}
