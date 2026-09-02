import { FormEvent, useState } from "react";
import type { Phase070ProviderCatalogItem, Phase070TenantIntegrationStatus } from "@/lib/tenant-integrations";
import { CheckCircle, RefreshCw, Play, Trash2, PlusCircle, Settings, Globe, Shield, Lock, Eye, EyeOff, Sparkles, Bot, Cpu } from "lucide-react";
import { useI18n } from "@/lib/i18n/useI18n";

interface IntegrationCardProps {
  provider: Phase070ProviderCatalogItem;
  integration: Phase070TenantIntegrationStatus | undefined;
  actionLoading: string | null;
  onSubmitCreate: (e: FormEvent<HTMLFormElement>) => void;
  onSubmitRotate: (e: FormEvent<HTMLFormElement>) => void;
  onSubmitRevoke: (e: FormEvent<HTMLFormElement>) => void;
  onSubmitTest: (e: FormEvent<HTMLFormElement>) => void;
}

function getProviderIcon(code: string) {
  switch (code.toLowerCase()) {
    case "facebook_page":
      return <Globe className="h-6 w-6 text-blue-500" />;
    case "openai":
      return <Bot className="h-6 w-6 text-emerald-500" />;
    case "gemini":
    case "google_gemini":
      return <Sparkles className="h-6 w-6 text-cyan-500" />;
    case "anthropic":
    case "claude":
      return <Cpu className="h-6 w-6 text-amber-500" />;
    default:
      return <Settings className="h-6 w-6 text-violet-500" />;
  }
}

export function IntegrationCard({
  provider,
  integration,
  actionLoading,
  onSubmitCreate,
  onSubmitRotate,
  onSubmitRevoke,
  onSubmitTest
}: IntegrationCardProps) {
  const { t } = useI18n("phase070");
  const isConfigured = !!integration && integration.credential_configured;
  const isConnecting = actionLoading !== null && actionLoading.includes(provider.provider_code);
  const [showConfig, setShowConfig] = useState(!isConfigured);
  const [showSecret, setShowSecret] = useState(false);

  const statusLabel = !isConfigured
    ? (t("phase070.integrations.credentialMissing") ?? "Chưa cấu hình")
    : integration?.status === "ACTIVE"
      ? "Đã kết nối an toàn"
      : `${integration.status} / ${integration.connection_state}`;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-1">
      {/* Accent top gradient line */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-500 opacity-60 group-hover:opacity-100 transition-opacity" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-slate-900/80 px-5 py-4">
          <div className="flex items-center space-x-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 shadow-sm">
               {getProviderIcon(provider.provider_code)}
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">{provider.provider_name}</h3>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 capitalize">{provider.provider_category || "AI Model / Channel"}</p>
            </div>
          </div>
          
          <div className={`inline-flex items-center space-x-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            isConfigured 
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" 
              : "border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400"
          }`}>
            {isConfigured && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
            <span>{statusLabel}</span>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 flex-col p-5">
          {isConfigured && !showConfig ? (
             <div className="flex flex-col space-y-4">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 flex items-start space-x-3">
                   <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                   <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-200">{t("phase070.integrations.credentialConfigured") ?? "Đã kích hoạt & Sẵn sàng"}</h4>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400/80 mt-0.5">
                        {t("phase070.integrations.description") ?? "API Key được mã hóa write-only trong két bảo mật SSOT."}
                      </p>
                      <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-2 truncate bg-white/60 dark:bg-black/30 px-2 py-0.5 rounded border border-emerald-500/20">
                         {integration.integration_key}
                      </p>
                   </div>
                </div>
                
                <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-100 dark:border-white/5">
                   <button 
                     type="button"
                     onClick={() => setShowConfig(true)}
                     className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700 hover:text-cyan-600 dark:text-slate-300 dark:hover:text-cyan-400 transition-colors"
                   >
                     <RefreshCw className="h-3.5 w-3.5" />
                     <span>{t("phase070.actions.rotate") ?? "Đổi Key mới"}</span>
                   </button>
                   
                   <div className="flex items-center space-x-2">
                     <form onSubmit={onSubmitTest} className="contents">
                        <input type="hidden" name="integration_key" value={integration.integration_key} />
                        <button 
                          type="submit"
                          disabled={isConnecting}
                          className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors disabled:opacity-50"
                        >
                          <Play className="h-3.5 w-3.5" />
                          <span>{isConnecting ? "Đang thử..." : "Test kết nối"}</span>
                        </button>
                     </form>

                     <form onSubmit={onSubmitRevoke} className="contents">
                        <input type="hidden" name="integration_key" value={integration.integration_key} />
                        <button 
                          type="submit"
                          disabled={isConnecting}
                          title="Thu hồi kết nối"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                     </form>
                   </div>
                </div>
             </div>
          ) : (
             <form onSubmit={isConfigured ? onSubmitRotate : onSubmitCreate} className="flex flex-col flex-1 space-y-3.5">
                <input type="hidden" name="provider_code" value={provider.provider_code} />
                
                {!isConfigured && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t("phase070.writeOnly.name") ?? "Tên định danh hiển thị"}</label>
                    <input 
                      required
                      name="integration_name"
                      placeholder={`Ví dụ: ${provider.provider_name} Chính thức`}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 shadow-sm"
                    />
                  </div>
                )}

                {isConfigured && (
                   <input type="hidden" name="integration_key" value={integration.integration_key} />
                )}
                
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {provider.provider_code === "facebook_page" ? "Page Access Token (BYOT)" : (t("phase070.writeOnly.secret") ?? "API Key / Access Token")}
                    </label>
                    <span className="flex items-center space-x-1 text-cyan-700 dark:text-cyan-400 text-[10px] font-bold uppercase tracking-wider bg-cyan-50 dark:bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-800/60">
                      <Shield className="h-3 w-3" />
                      <span>Chỉ ghi (Vault)</span>
                    </span>
                  </div>
                  <div className="relative group/input">
                    <input 
                      required
                      type={showSecret ? "text" : "password"}
                      name="secret_material"
                      placeholder={provider.provider_code === "facebook_page" ? "EAAB..." : "sk-proj-..."}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 pl-9 pr-9 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 shadow-sm font-mono"
                    />
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-focus-within/input:text-cyan-500 transition-colors" />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                    >
                      {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {provider.provider_code === "facebook_page" && (
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Fanpage ID (bắt buộc)</label>
                    <input 
                      required
                      type="text"
                      name="page_id"
                      placeholder="Ví dụ: 100234567890123"
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 px-3.5 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 shadow-sm font-mono"
                    />
                  </div>
                )}

                <div className="mt-auto pt-4 flex items-center justify-between border-t border-slate-100 dark:border-white/5">
                   {isConfigured && (
                     <button 
                       type="button" 
                       onClick={() => setShowConfig(false)}
                       className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                     >
                       Hủy bỏ
                     </button>
                   )}
                   <button 
                     type="submit"
                     disabled={isConnecting}
                     className="ml-auto flex items-center space-x-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-cyan-500/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0"
                   >
                     <PlusCircle className="h-4 w-4" />
                     <span>{isConnecting ? "Đang xử lý..." : isConfigured ? "Lưu Key mới" : "Kích hoạt kết nối"}</span>
                   </button>
                </div>
             </form>
          )}
        </div>
      </div>
    </div>
  );
}
