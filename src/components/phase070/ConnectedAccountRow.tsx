import React from "react";
import { StateBadge } from "@/components/shared/StateBadge";
import { RotateCcw, Trash2, Play } from "lucide-react";
import type { Phase070ProviderCatalogItem, Phase070TenantIntegrationStatus } from "@/lib/tenant-integrations";

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
  const meta = integration.public_metadata as any;
  const isFacebook = provider.provider_code === "facebook_page";
  
  // Facebook-specific metadata
  const pageName = isFacebook ? (meta?.page_name || "Unknown Page") : integration.integration_name;
  const avatarUrl = isFacebook ? meta?.page_avatar_url : null;
  const pageId = isFacebook ? meta?.page_id : null;

  // Determine glow based on connection state
  let glowColor = "border-slate-700/50";
  let statusText = "UNVERIFIED";
  let statusState = "blocked";
  
  if (integration.connection_state === "verified") {
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
    if (confirm("Are you sure you want to revoke this access token?")) {
      onRevoke(integration.integration_key);
    }
  };

  const handleRotate = () => {
    if (actionLoading) return;
    const newToken = prompt("Enter the new Access Token:");
    if (!newToken) return;
    onRotate(integration.integration_key, newToken, pageId);
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-sm transition-all hover:bg-slate-800/40">
      <div className="flex items-center space-x-4">
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
        <StateBadge label={statusState === "ready" ? "pass" : "blocked"} displayLabel={statusText} />
        
        <div className="flex items-center space-x-2 border-l border-slate-800 pl-4">
          <button 
            onClick={handleTest}
            disabled={!!actionLoading}
            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-400/10 rounded-lg transition-colors"
            title="Test Connection"
          >
            <Play size={16} className={actionLoading ? "opacity-50" : ""} />
          </button>
          
          <button 
            onClick={handleRotate}
            disabled={!!actionLoading}
            className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors"
            title="Update Token"
          >
            <RotateCcw size={16} className={actionLoading ? "opacity-50" : ""} />
          </button>

          <button 
            onClick={handleRevoke}
            disabled={!!actionLoading}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors"
            title="Revoke Token"
          >
            <Trash2 size={16} className={actionLoading ? "opacity-50" : ""} />
          </button>
        </div>
      </div>
    </div>
  );
}
