import { FormEvent, useState } from "react";
import type { Phase070ProviderCatalogItem, Phase070TenantIntegrationStatus } from "@/lib/tenant-integrations";
import { Key, CheckCircle, RefreshCw, Play, Trash2, PlusCircle, Settings, Globe, Shield, Lock } from "lucide-react";
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
  const statusLabel = !isConfigured
    ? (t("phase070.integrations.credentialMissing") ?? "Not configured")
    : integration?.status === "ACTIVE"
      ? "Configured and healthy"
      : `${integration.status} / ${integration.connection_state}`;

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-2xl transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-900/20">
      {/* Animated gradient border on hover */}
      <div className="absolute inset-0 z-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 overflow-hidden rounded-2xl">
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(6,182,212,0.8)_360deg)]" />
      </div>
      <div className="absolute inset-[1px] z-0 rounded-[15px] bg-slate-950/90 backdrop-blur-3xl" />
      
      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 bg-slate-900/40 px-6 py-5">
          <div className="flex items-center space-x-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 border border-white/10 text-cyan-400 shadow-inner">
               {provider.provider_code === "facebook_page" ? <Globe className="h-6 w-6" /> : <Settings className="h-6 w-6" />}
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-wide text-slate-100">{provider.provider_name}</h3>
              <p className="text-xs text-slate-400">{provider.provider_category}</p>
            </div>
          </div>
          
          <div className={`inline-flex items-center space-x-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${isConfigured ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]" : "border-white/10 bg-white/5 text-slate-400"}`}>
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
      <div className="flex flex-1 flex-col p-6">
        {isConfigured && !showConfig ? (
           <div className="flex flex-col space-y-4">
              <div className="rounded-xl border border-emerald-900/30 bg-emerald-900/10 p-4 flex items-start space-x-3">
                 <CheckCircle className="h-5 w-5 text-emerald-400 mt-0.5" />
                 <div>
                    <h4 className="text-sm font-medium text-emerald-200">{t("phase070.integrations.credentialConfigured") ?? "Configured and healthy"}</h4>
                    <p className="text-xs text-emerald-400/70 mt-1">
                      {t("phase070.integrations.description") ?? "Key is securely stored in write-only vault."}
                    </p>
                    <p className="text-xs font-mono text-slate-500 mt-2">
                       {integration.integration_key}
                    </p>
                 </div>
              </div>
              
              <div className="mt-auto pt-4 flex items-center space-x-3">
                 <button 
                   onClick={() => setShowConfig(true)}
                   className="flex items-center space-x-2 text-sm text-slate-300 hover:text-cyan-400 transition-colors"
                 >
                   <RefreshCw className="h-4 w-4" />
                   <span>{t("phase070.actions.rotate") ?? "Rotate Key"}</span>
                 </button>
                 
                 <form onSubmit={onSubmitTest} className="contents">
                    <input type="hidden" name="integration_key" value={integration.integration_key} />
                    <button 
                      type="submit"
                      disabled={isConnecting}
                      className="flex items-center space-x-2 text-sm text-slate-300 hover:text-emerald-400 transition-colors ml-auto"
                    >
                      <Play className="h-4 w-4" />
                      <span>{t("phase070.actions.broker") ?? "Test Connection"}</span>
                    </button>
                 </form>

                 <form onSubmit={onSubmitRevoke} className="contents">
                    <input type="hidden" name="integration_key" value={integration.integration_key} />
                    <button 
                      type="submit"
                      disabled={isConnecting}
                      className="flex items-center space-x-2 text-sm text-slate-300 hover:text-rose-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                 </form>
              </div>
           </div>
        ) : (
           <form onSubmit={isConfigured ? onSubmitRotate : onSubmitCreate} className="flex flex-col flex-1 space-y-4">
              <input type="hidden" name="provider_code" value={provider.provider_code} />
              
              {!isConfigured && (
                 <>
                   <div className="hidden space-y-1.5">
                     <label className="text-xs font-medium text-slate-400">{t("phase070.writeOnly.key") ?? "Integration Key (Unique ID)"}</label>
                     <input 
                       name="integration_key"
                       placeholder="e.g., openai_main"
                       className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                     />
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-xs font-medium text-slate-400">{t("phase070.writeOnly.name") ?? "Display Name"}</label>
                     <input 
                       required
                       name="integration_name"
                       placeholder="e.g., OpenAI Production"
                       className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                     />
                   </div>
                 </>
              )}

              {isConfigured && (
                 <input type="hidden" name="integration_key" value={integration.integration_key} />
              )}
              
              <div className="space-y-1.5 mt-2">
                <label className="text-xs font-semibold text-slate-300 flex justify-between items-center">
                  <span>{provider.provider_code === "facebook_page" ? "Page Access Token (BYOT)" : (t("phase070.writeOnly.secret") ?? "Secret Material (API Key)")}</span>
                  <span className="flex items-center space-x-1 text-cyan-400/80 text-[10px] uppercase tracking-widest bg-cyan-950/50 px-2 py-0.5 rounded border border-cyan-900/50">
                    <Shield className="h-3 w-3" />
                    <span>Write-Only</span>
                  </span>
                </label>
                <div className="relative group/input">
                  <input 
                    required
                    type="password"
                    name="secret_material"
                    placeholder={provider.provider_code === "facebook_page" ? "••••••••••••••••••••••••" : "••••••••••••••••••••••••"}
                    className="w-full rounded-xl border border-white/10 bg-black/40 pl-10 pr-4 py-3 text-sm text-emerald-400 tracking-[0.2em] placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 shadow-inner transition-colors"
                  />
                  <Lock className="absolute left-3 top-3.5 h-4 w-4 text-slate-500 group-focus-within/input:text-cyan-400 transition-colors" />
                </div>
              </div>

              {provider.provider_code === "facebook_page" && (
                <div className="space-y-1.5 mt-4">
                  <label className="text-xs font-semibold text-slate-300">Fanpage ID (bắt buộc)</label>
                  <input 
                    required
                    type="text"
                    name="page_id"
                    placeholder="e.g. 10023456789"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 shadow-inner transition-colors"
                  />
                </div>
              )}

              <div className="mt-auto pt-6 flex items-center justify-between">
                 {isConfigured && (
                   <button 
                     type="button" 
                     onClick={() => setShowConfig(false)}
                     className="text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
                   >
                     Cancel
                   </button>
                 )}
                 <button 
                   type="submit"
                   disabled={isConnecting}
                   className="ml-auto flex items-center space-x-2 rounded-xl bg-cyan-500/20 px-5 py-2.5 text-sm font-bold tracking-wide text-cyan-400 transition-all hover:bg-cyan-500/30 hover:text-cyan-300 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
                 >
                   <PlusCircle className="h-4 w-4" />
                   <span>{isConfigured ? (t("phase070.writeOnly.submit") ?? 'Save New Key') : (t("phase070.writeOnly.submit") ?? 'Configure Provider')}</span>
                 </button>
              </div>
           </form>
        )}
      </div>
      </div>
    </div>
  );
}
