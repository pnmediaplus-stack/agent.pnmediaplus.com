import { useState } from "react";
import { StateBadge } from "@/components/shared/StateBadge";
import { RotateCcw, Trash2, Play, Key, X, Check, Eye, EyeOff, Globe, Bot, Sparkles, Cpu, Settings } from "lucide-react";
import type { Phase070ProviderCatalogItem, Phase070TenantIntegrationStatus } from "@/lib/tenant-integrations";
import { useI18n } from "@/lib/i18n/useI18n";

interface ConnectedAccountRowProps {
  provider: Phase070ProviderCatalogItem;
  integration: Phase070TenantIntegrationStatus;
  actionLoading: string | null;
  onRotate: (integrationKey: string, secretMaterial: string, pageId?: string) => Promise<void>;
  onRevoke: (integrationKey: string) => Promise<void>;
  onTest: (integrationKey: string) => Promise<void>;
  onUpdateMetadata: (integrationKey: string, metadataUpdates: Record<string, any>) => Promise<void>;
}

export function ConnectedAccountRow({
  provider,
  integration,
  actionLoading,
  onRotate,
  onRevoke,
  onTest,
  onUpdateMetadata,
}: ConnectedAccountRowProps) {
  const { t } = useI18n("phase070");
  const meta = integration.public_metadata as any;
  const isFacebook = provider.provider_code === "facebook_page";
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [newToken, setNewToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  
  // Facebook-specific metadata
  const pageName = isFacebook ? (meta?.page_name || (t("phase070.dashboard.unknownPage") ?? "Fanpage kết nối")) : integration.integration_name;
  const avatarUrl = isFacebook ? meta?.page_avatar_url : null;
  const pageId = isFacebook ? meta?.page_id : null;

  // Determine glow based on connection state
  let statusText = "CHƯA XÁC THỰC";
  let statusBadgeState = "blocked";
  
  if (integration.connection_state === "verified" || integration.connection_state === "healthy") {
    statusText = "HOẠT ĐỘNG TỐT";
    statusBadgeState = "ready";
  } else if (integration.connection_state === "error") {
    statusText = "LỖI KẾT NỐI";
  }

  // Fallback for avatar
  const renderAvatar = () => {
    if (avatarUrl && !avatarLoadFailed) {
      return (
        <img 
          src={avatarUrl} 
          alt={pageName} 
          className="w-12 h-12 rounded-2xl border-2 border-slate-200 dark:border-white/10 object-cover bg-slate-100 dark:bg-slate-800 shadow-sm" 
          referrerPolicy="no-referrer"
          crossOrigin="anonymous"
          onError={() => setAvatarLoadFailed(true)}
        />
      );
    }
    return (
      <div className="w-12 h-12 rounded-2xl border-2 border-slate-200 dark:border-white/10 flex items-center justify-center bg-gradient-to-br from-cyan-500/10 to-indigo-500/10 text-cyan-600 dark:text-cyan-400 font-bold text-lg shadow-sm">
        {pageName.charAt(0).toUpperCase()}
      </div>
    );
  };

  const handleTest = () => {
    if (actionLoading) return;
    onTest(integration.integration_key);
  };

  const handleRevoke = () => {
    if (actionLoading) return;
    if (confirm(t("phase070.dashboard.confirmRevoke") ?? `Bạn có chắc chắn muốn ngắt kết nối và thu hồi quyền truy cập của "${pageName}"?`)) {
      onRevoke(integration.integration_key);
    }
  };

  const submitRotate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newToken.trim()) return;
    await onRotate(integration.integration_key, newToken.trim(), pageId);
    setNewToken("");
    setIsRotating(false);
  };

  return (
    <div className="group rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl p-5 transition-all hover:shadow-lg hover:shadow-cyan-500/5 hover:border-slate-300 dark:hover:border-white/20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4 min-w-0">
          {renderAvatar()}
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate">{pageName}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-0.5">
              <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-400">{provider.provider_name}</span>
              <span className="text-slate-400 dark:text-slate-600">•</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[200px]">{integration.integration_key}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end space-x-3 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-white/5">
          <div className={`inline-flex items-center space-x-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
            statusBadgeState === "ready"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              : "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
          }`}>
            {statusBadgeState === "ready" && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
            <span>{statusText}</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <button 
              onClick={handleTest}
              disabled={!!actionLoading}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl border border-emerald-200/80 dark:border-emerald-800 transition-colors disabled:opacity-50"
              title={t("phase070.dashboard.test") ?? "Kiểm tra kết nối"}
            >
              <Play size={13} className={actionLoading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Kiểm tra</span>
            </button>
            
            <button 
              onClick={() => setIsRotating(!isRotating)}
              disabled={!!actionLoading}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl border border-slate-200/80 dark:border-slate-700 transition-colors disabled:opacity-50"
              title={t("phase070.dashboard.rotate") ?? "Đổi Access Token"}
            >
              <RotateCcw size={13} className={actionLoading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Đổi Key</span>
            </button>

            <button 
              onClick={handleRevoke}
              disabled={!!actionLoading}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors disabled:opacity-50"
              title={t("phase070.dashboard.revoke") ?? "Hủy kết nối"}
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Model bindings (if provider has LLM models) */}
      {!!(provider.public_metadata as any)?.models && Array.isArray((provider.public_metadata as any).models) && (() => {
        const models = (provider.public_metadata as any).models;
        const imageModels = models.filter((m: any) => m.capability === 'image');
        const textModels = models.filter((m: any) => m.capability === 'text');
        const bindings = meta?.bindings || {};

        const handleLaneUpdate = (laneKey: string, capability: string, modelCode: string) => {
          const newBindings = {
            ...bindings,
            [laneKey]: modelCode ? {
              provider_code: provider.provider_code,
              capability: capability,
              model_code: modelCode,
              lane_key: laneKey
            } : undefined
          };
          onUpdateMetadata(integration.integration_key, { bindings: newBindings });
        };

        if (imageModels.length === 0 && textModels.length === 0) return null;

        return (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center gap-4">
            {textModels.length > 0 && (
              <label className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-semibold">Text Model:</span>
                <select 
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white outline-none focus:border-cyan-500 font-medium"
                  value={bindings.text_lane?.model_code || meta?.preferred_text_model || ""}
                  onChange={(e) => handleLaneUpdate('text_lane', 'text', e.target.value)}
                  disabled={!!actionLoading}
                >
                  <option value="">-- Mặc định --</option>
                  {textModels.map((m: any) => (
                    <option key={m.code} value={m.code}>{m.code}</option>
                  ))}
                </select>
              </label>
            )}
            {imageModels.length > 0 && (
              <label className="flex items-center space-x-2 text-xs text-slate-600 dark:text-slate-400">
                <span className="font-semibold">Image Model:</span>
                <select 
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white outline-none focus:border-cyan-500 font-medium"
                  value={bindings.image_lane?.model_code || meta?.preferred_image_model || ""}
                  onChange={(e) => handleLaneUpdate('image_lane', 'image', e.target.value)}
                  disabled={!!actionLoading}
                >
                  <option value="">-- Mặc định --</option>
                  {imageModels.map((m: any) => (
                    <option key={m.code} value={m.code}>{m.code}</option>
                  ))}
                </select>
              </label>
            )}
            <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto">
              Chuyển tiếp tự động sang workflow n8n
            </span>
          </div>
        );
      })()}

      {/* Rotate Key inline drawer */}
      {isRotating && (
        <form onSubmit={submitRotate} className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/60 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <div className="relative flex-1 w-full">
              <input 
                type={showToken ? "text" : "password"}
                value={newToken}
                onChange={(e) => setNewToken(e.target.value)}
                placeholder="Nhập Access Token / API Key mới..."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 pl-3 pr-9 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
              <button 
                type="button"
                onClick={() => setIsRotating(false)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Hủy
              </button>
              <button 
                type="submit"
                disabled={!newToken.trim() || !!actionLoading}
                className="px-4 py-1.5 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-sm transition-colors disabled:opacity-50"
              >
                Cập nhật Token
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
