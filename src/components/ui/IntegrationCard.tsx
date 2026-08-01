import { FormEvent, useState } from "react";
import { StateBadge } from "@/components/shared/StateBadge";
import type { Phase070ProviderCatalogItem, Phase070TenantIntegrationStatus } from "@/lib/tenant-integrations";
import { Key, CheckCircle, RefreshCw, Play, Trash2, PlusCircle, Settings } from "lucide-react";
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

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900/40 backdrop-blur-md transition-all duration-300 hover:border-cyan-500/30 hover:bg-slate-800/60 hover:shadow-2xl hover:shadow-cyan-900/10">
      {/* Glow effect on hover */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700/50 bg-slate-800/30 px-6 py-4">
        <div className="flex items-center space-x-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-cyan-400">
             {/* Logo placeholder, replace with real logo if available */}
             <Settings className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-medium text-slate-200">{provider.provider_name}</h3>
            <p className="text-xs text-slate-400">{provider.provider_category}</p>
          </div>
        </div>
        <StateBadge 
          label={isConfigured ? (integration.status === "ACTIVE" ? "ready" : "blocked") : "blocked"} 
          displayLabel={isConfigured ? integration.status : (t("integrations.credentialMissing") ?? "NOT CONFIGURED")} 
        />
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-6">
        {isConfigured && !showConfig ? (
           <div className="flex flex-col space-y-4">
              <div className="rounded-xl border border-emerald-900/30 bg-emerald-900/10 p-4 flex items-start space-x-3">
                 <CheckCircle className="h-5 w-5 text-emerald-400 mt-0.5" />
                 <div>
                    <h4 className="text-sm font-medium text-emerald-200">{t("integrations.credentialConfigured") ?? "Integration Active"}</h4>
                    <p className="text-xs text-emerald-400/70 mt-1">
                      {t("integrations.description") ?? "Key is securely stored in write-only vault."}
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
                   <span>{t("actions.rotate") ?? "Rotate Key"}</span>
                 </button>
                 
                 <form onSubmit={onSubmitTest} className="contents">
                    <input type="hidden" name="integration_key" value={integration.integration_key} />
                    <button 
                      type="submit"
                      disabled={isConnecting}
                      className="flex items-center space-x-2 text-sm text-slate-300 hover:text-emerald-400 transition-colors ml-auto"
                    >
                      <Play className="h-4 w-4" />
                      <span>{t("actions.broker") ?? "Test Connection"}</span>
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
                   <div className="space-y-1.5">
                     <label className="text-xs font-medium text-slate-400">{t("writeOnly.key") ?? "Integration Key (Unique ID)"}</label>
                     <input 
                       required
                       name="integration_key"
                       placeholder="e.g., openai_main"
                       className="w-full rounded-lg border border-slate-700 bg-slate-900/50 px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                     />
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-xs font-medium text-slate-400">{t("writeOnly.name") ?? "Display Name"}</label>
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
              
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 flex justify-between">
                  <span>{t("writeOnly.secret") ?? "Secret Material (API Key)"}</span>
                  <span className="text-rose-400/80 text-[10px] uppercase tracking-widest">Write-Only</span>
                </label>
                <div className="relative">
                  <input 
                    required
                    type="password"
                    name="secret_material"
                    placeholder="sk-..."
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/50 pl-10 pr-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                  <Key className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                </div>
              </div>

              <div className="mt-auto pt-4 flex items-center justify-between">
                 {isConfigured && (
                   <button 
                     type="button" 
                     onClick={() => setShowConfig(false)}
                     className="text-sm text-slate-400 hover:text-slate-200"
                   >
                     Cancel
                   </button>
                 )}
                 <button 
                   type="submit"
                   disabled={isConnecting}
                   className="ml-auto flex items-center space-x-2 rounded-lg bg-cyan-600/20 px-4 py-2 text-sm font-medium text-cyan-400 transition-colors hover:bg-cyan-600/30 hover:text-cyan-300 disabled:opacity-50"
                 >
                   <PlusCircle className="h-4 w-4" />
                   <span>{isConfigured ? (t("writeOnly.submit") ?? 'Save New Key') : (t("writeOnly.submit") ?? 'Configure Provider')}</span>
                 </button>
              </div>
           </form>
        )}
      </div>
    </div>
  );
}
