"use client";

import { FormEvent, useEffect, useState, useMemo } from "react";
import { StateBadge } from "@/components/shared/StateBadge";
import { useI18n } from "@/lib/i18n/useI18n";
import type { Phase070ProviderCatalogItem, Phase070TenantIntegrationStatus } from "@/lib/tenant-integrations";
import { IntegrationCard } from "@/components/ui/IntegrationCard";
import { ConnectedAccountRow } from "./ConnectedAccountRow";
import { 
  createTenantIntegration, 
  rotateTenantIntegration, 
  revokeTenantIntegration, 
  issueReferenceToken, 
  updateTenantIntegrationMetadata, 
  type VaultActionResponse 
} from "@/app/actions/vault-actions";
import { ProviderCatalogModal } from "./ProviderCatalogModal";
import { 
  ShieldCheck, 
  KeyRound, 
  Sparkles, 
  Layers, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Settings, 
  Globe, 
  Bot, 
  Filter,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";

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

export function TenantIntegrationsView() {
  const { t } = useI18n("phase070");
  const [response, setResponse] = useState<TenantIntegrationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [operationResult, setOperationResult] = useState<TenantIntegrationActionResponse | null>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "connected" | "ai" | "channels">("all");
  const [searchQuery, setSearchQuery] = useState("");

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
      const actionRes = result as TenantIntegrationActionResponse;
      setOperationResult(actionRes);
      if (actionRes.state === "ready") {
        toast.success("Thao tác thực thi thành công!");
      } else {
        toast.error(`Thao tác thất bại: ${actionRes.reason}`);
      }
      await load();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      setOperationResult({
        ok: false,
        state: "blocked",
        reason: msg
      });
      toast.error(`Lỗi: ${msg}`);
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
    const existingIntegration = response?.data?.integrations.find(i => i.integration_key === integrationKey);

    if (existingIntegration) {
      await executeAction(providerCode, () => 
        rotateTenantIntegration(integrationKey, accessToken, pageId)
      );
    } else {
      await executeAction(providerCode, async () => {
        let result = await createTenantIntegration(providerCode, integrationKey, integrationName, accessToken, pageId);
        if (!result.ok && result.reason && result.reason.includes("ALREADY_EXISTS")) {
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
      toast.error("Thiếu mã định danh integration_key");
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
      toast.error("Thiếu mã định danh integration_key");
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
      toast.error("Thiếu mã định danh integration_key");
      return;
    }
    const providerCode = String(formData.get("provider_code") || "test");
    await executeAction(providerCode, () =>
      issueReferenceToken(integrationKey, providerCode)
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
             <div key={i} className="h-24 animate-pulse rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
             <div key={i} className="h-64 animate-pulse rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60" />
          ))}
        </div>
      </div>
    );
  }

  if (!response?.data) {
    return (
      <div className="rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/80 dark:bg-rose-950/30 p-8 text-center space-y-3 backdrop-blur-xl">
        <AlertCircle className="w-8 h-8 text-rose-600 dark:text-rose-400 mx-auto" />
        <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">Không thể tải dữ liệu Tích hợp</h3>
        <p className="text-xs text-rose-700 dark:text-rose-400 max-w-md mx-auto">
          {response?.reason ?? "Phiên làm việc hoặc quyền hạn chưa sẵn sàng."}
        </p>
        <button 
          onClick={load}
          className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-xl shadow-sm transition-all"
        >
          Thử lại
        </button>
      </div>
    );
  }

  const { organization, providers, integrations } = response.data;
  const activeIntegrations = integrations.filter(i => i.credential_configured && i.status !== 'revoked');

  // Filter logic
  const filteredProviders = providers.filter((p) => {
    const matchesSearch = p.provider_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.provider_code.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (activeTab === "ai") {
      return p.provider_code !== "facebook_page";
    }
    if (activeTab === "channels") {
      return p.provider_code === "facebook_page";
    }
    if (activeTab === "connected") {
      return activeIntegrations.some(i => i.provider_code === p.provider_code);
    }
    return true;
  });

  return (
    <div className="relative w-full space-y-7">
      {/* ── TOP STATS BAR ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Org Stat */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tổ chức / Doanh nghiệp</span>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-violet-50 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300 rounded-full border border-violet-200 dark:border-violet-800/60">
              {organization.role}
            </span>
          </div>
          <div className="mt-2 text-base font-extrabold text-slate-900 dark:text-white truncate">
            {organization.organization_name}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
            {organization.organization_key}
          </div>
        </div>

        {/* Security Vault Stat */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Két khóa bảo mật SSOT</span>
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 text-base font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Write-Only Vault Active</span>
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Khóa API không bao giờ bị lộ ra bề mặt đọc
          </div>
        </div>

        {/* Active Integrations Stat */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl p-5 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Trạng thái kết nối</span>
            <Layers className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div className="mt-2 text-base font-extrabold text-slate-900 dark:text-white">
            {activeIntegrations.length} / {providers.length} Kênh đã kích hoạt
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Sẵn sàng đồng bộ trực tiếp với Agent & n8n
          </div>
        </div>
      </div>

      {/* ── OPERATION RECEIPT CARD (IF PRESENT) ──────────── */}
      {operationResult && (
        <div className={`rounded-2xl border p-4.5 backdrop-blur-xl animate-in fade-in duration-200 ${
          operationResult.state === "ready" 
            ? "border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-950/30" 
            : "border-rose-500/30 bg-rose-50/70 dark:bg-rose-950/30"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <StateBadge label={operationResult.state === "ready" ? "pass" : "blocked"} displayLabel={operationResult.state === "ready" ? "THÀNH CÔNG" : "THẤT BẠI"} />
              <div className={`text-xs font-bold ${operationResult.state === "ready" ? "text-emerald-800 dark:text-emerald-300" : "text-rose-800 dark:text-rose-300"}`}>
                Lý do: {operationResult.reason}
              </div>
            </div>
            <button 
              onClick={() => setOperationResult(null)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              Đóng
            </button>
          </div>
          {operationResult.data?.receipt && (
            <div className="mt-2 text-[11px] font-mono text-slate-600 dark:text-slate-400 space-y-0.5 bg-white/50 dark:bg-black/20 p-2 rounded-lg border border-slate-200/50 dark:border-white/5">
               <p>Mã biên lai (Receipt Ref): {operationResult.data.receipt.receipt_ref}</p>
               <p>Trạng thái Broker: {operationResult.data.receipt.broker_status}</p>
            </div>
          )}
        </div>
      )}

      {/* ── CONNECTED FANPAGES & ACCOUNTS SECTION ─────────── */}
      {activeIntegrations.length > 0 && (
        <section className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Fanpage & Tài Khoản Đang Hoạt Động</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Danh sách các kênh tích hợp đã xác thực và cấp quyền cho AI Agent</p>
            </div>
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              {activeIntegrations.length} Active
            </span>
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
                  onUpdateMetadata={async (integrationKey, metadataUpdates) => {
                    await executeAction(provider.provider_code, () =>
                      updateTenantIntegrationMetadata(integrationKey, metadataUpdates)
                    );
                  }}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* ── PROVIDERS CATALOG SECTION ─────────────────────── */}
      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Danh Mục Nhà Cung Cấp (BYOK Vault)</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Kết nối các mô hình AI riêng (Bring Your Own Key) và các cổng giao tiếp</p>
          </div>

          {(organization.role === "admin" || organization.role === "owner") && (
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-violet-500/20 transition-all hover:-translate-y-0.5 shrink-0"
            >
              <Settings className="w-4 h-4" />
              <span>Quản lý Danh Mục AI (Admin)</span>
            </button>
          )}
        </div>

        {/* Search & Tabs Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-1.5 rounded-2xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 backdrop-blur-xl">
          {/* Tabs */}
          <div className="flex items-center space-x-1 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "all"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Tất cả ({providers.length})
            </button>
            <button
              onClick={() => setActiveTab("connected")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "connected"
                  ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Đã nối ({activeIntegrations.length})
            </button>
            <button
              onClick={() => setActiveTab("ai")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "ai"
                  ? "bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Mô hình AI
            </button>
            <button
              onClick={() => setActiveTab("channels")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeTab === "channels"
                  ? "bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Fanpage / Kênh
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm nhà cung cấp..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredProviders.map((provider) => {
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

        {filteredProviders.length === 0 && (
           <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/50 p-12 text-center backdrop-blur-xl">
              <Sparkles className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                {searchQuery ? `Không tìm thấy nhà cung cấp nào khớp với "${searchQuery}"` : "Không có nhà cung cấp nào trong mục này."}
              </p>
           </div>
        )}
      </section>

      {/* Admin Catalog Modal */}
      <ProviderCatalogModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        providers={providers}
        onRefresh={load}
      />
    </div>
  );
}
