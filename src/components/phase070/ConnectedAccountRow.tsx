import { StateBadge } from "@/components/shared/StateBadge";
import { RotateCcw, Trash2, Play } from "lucide-react";
import type { Phase070ProviderCatalogItem, Phase070TenantIntegrationStatus } from "@/lib/tenant-integrations";
import { useI18n } from "@/lib/i18n/useI18n";

interface ConnectedAccountRowProps {
  provider: Phase070ProviderCatalogItem;
  integration: Phase070TenantIntegrationStatus;
  actionLoading: string | null;
  onRotate: (integrationKey: string, secretMaterial: string, pageId?: string) => Promise<void>;
  onRevoke: (integrationKey: string) => Promise<void>;
  onTest: (integrationKey: string) => Promise<void>;
}

export function ConnectedAccountRow({
  provider,
  integration,
  actionLoading,
  onRotate,
  onRevoke,
  onTest,
}: ConnectedAccountRowProps) {
  const { t } = useI18n("phase070");
  const meta = integration.public_metadata as any;
  const isFacebook = provider.provider_code === "facebook_page";
  
  // Facebook-specific metadata
  const pageName = isFacebook ? (meta?.page_name || (t("phase070.dashboard.unknownPage") ?? "Unknown Page")) : integration.integration_name;
  const avatarUrl = isFacebook ? meta?.page_avatar_url : null;
  const pageId = isFacebook ? meta?.page_id : null;

  // Determine glow based on connection state
  let glowColor = "border-slate-700/50";
  let statusText = "UNVERIFIED";
  let statusState = "blocked";
  
  if (integration.connection_state === "verified" || integration.connection_state === "healthy") {
    glowColor = "border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]";
    statusText = "PASSED";
    statusState = "ready";
  } else if (integration.connection_state === "error") {
    glowColor = "border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.2)]";
    statusText = "BLOCKED";
  }

  // Fallback for avatar
  const renderAvatar = () => {
    if (avatarUrl) {
      return (
        <img 
          src={avatarUrl} 
          alt={pageName} 
          className={`w-12 h-12 rounded-full border-2 object-cover bg-slate-800 ${glowColor}`} 
        />
      );
    }
    return (
      <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center bg-slate-800 ${glowColor}`}>
        <span className="text-lg font-bold text-slate-400">{pageName.charAt(0)}</span>
      </div>
    );
  };

  const handleTest = () => {
    if (actionLoading) return;
    onTest(integration.integration_key);
  };

  const handleRevoke = () => {
    if (actionLoading) return;
    if (confirm(t("phase070.dashboard.confirmRevoke") ?? "Are you sure you want to revoke this access token?")) {
      onRevoke(integration.integration_key);
    }
  };

  const handleRotate = () => {
    if (actionLoading) return;
    const newToken = prompt(t("phase070.dashboard.promptNewToken") ?? "Enter the new Access Token:");
    if (!newToken) return;
    onRotate(integration.integration_key, newToken, pageId);
  };

  return (
    <div className="group flex items-center justify-between p-5 rounded-2xl border border-white/5 bg-slate-950/40 backdrop-blur-2xl transition-all hover:bg-slate-900/60 hover:border-white/10 hover:shadow-xl hover:shadow-cyan-900/10">
      <div className="flex items-center space-x-5">
        {renderAvatar()}
        <div>
          <h3 className="text-base font-semibold text-slate-200 tracking-tight">{pageName}</h3>
          <div className="flex items-center space-x-2 mt-0.5">
            <span className="text-xs font-medium text-slate-500">{provider.provider_name}</span>
            <span className="text-slate-700">•</span>
            <span className="text-xs text-slate-500 font-mono">{integration.integration_key}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-6">
        <div className={`inline-flex items-center space-x-2 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${statusState === "ready" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]" : "border-rose-500/30 bg-rose-500/10 text-rose-400"}`}>
          {statusState === "ready" && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
          <span>{statusText}</span>
        </div>
        
        <div className="flex items-center space-x-2 border-l border-slate-800 pl-4">
          <button 
            onClick={handleTest}
            disabled={!!actionLoading}
            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
            title={t("phase070.dashboard.test") ?? "Test Connection"}
          >
            <Play size={16} className={actionLoading ? "opacity-50" : ""} />
          </button>
          
          <button 
            onClick={handleRotate}
            disabled={!!actionLoading}
            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
            title={t("phase070.dashboard.rotate") ?? "Update Token"}
          >
            <RotateCcw size={16} className={actionLoading ? "opacity-50" : ""} />
          </button>

          <button 
            onClick={handleRevoke}
            disabled={!!actionLoading}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
            title={t("phase070.dashboard.revoke") ?? "Revoke Token"}
          >
            <Trash2 size={16} className={actionLoading ? "opacity-50" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
}
