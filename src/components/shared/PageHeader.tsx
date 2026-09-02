"use client";

import { StateBadge } from "@/components/shared/StateBadge";
import { useI18n } from "@/lib/i18n/useI18n";
import { useBanner } from "@/hooks/useBanner";
import { UploadBannerButton } from "@/components/shared/UploadBannerButton";

type PageHeaderProps = {
  title: string;
  purpose: string;
  statusLabel: string;
  statusValue: string;
  statusDisplayValue?: string;
  allowedActions: string[];
  forbiddenActions?: string[];
  bannerKey?: string; // e.g. 'chat_dashboard_banner'
};

export function PageHeader({
  title,
  purpose,
  statusLabel,
  statusValue,
  statusDisplayValue,
  allowedActions,
  forbiddenActions = [],
  bannerKey = 'chat_dashboard_banner'
}: PageHeaderProps) {
  const { t } = useI18n("shared");
  const { bannerUrl, opacity, isLoading } = useBanner(bannerKey);
  const bgImageUrl = bannerUrl || 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=1200&q=80';

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)]">
      {/* Header section with a sleek, subtle gradient background */}
      <div className="relative border-b border-slate-200 dark:border-slate-800 px-5 py-4 sm:py-5 overflow-hidden group">
        
        {/* Edit Button (Visible on hover) */}
        <UploadBannerButton 
          settingKey={bannerKey} 
          className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-200" 
        />

        {/* Background Image - Use bg-cover without distortion, anchored to the right so the main subject isn't clipped */}
        <div 
          className="absolute inset-0 bg-cover bg-right bg-no-repeat transition-all duration-500"
          style={{ 
            backgroundImage: isLoading ? 'none' : `url('${bgImageUrl}')`,
            opacity: isLoading ? 0 : 1
          }}
        />
        {/* Configurable Gradient overlay */}
        <div 
          className="absolute inset-0 bg-gradient-to-r from-white via-white/50 to-transparent dark:from-slate-950 dark:via-slate-950/50 dark:to-transparent" 
          style={{ opacity: opacity !== undefined ? opacity / 100 : 1 }}
        />
        {/* Subtle decorative glow */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[100px] -left-[100px] w-[300px] h-[300px] rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 blur-[80px]" />
        </div>

        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                {statusLabel}
              </p>
            </div>
            
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h1>
            
            <p className="max-w-2xl text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-400 line-clamp-2">
              {purpose}
            </p>
          </div>
          
          <div className="shrink-0 flex flex-col items-start lg:items-end gap-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
              {t("shared.page.currentStatus") ?? "Trạng thái hiện tại"}
            </div>
            <StateBadge label={statusValue} displayLabel={statusDisplayValue} />
          </div>
        </div>
      </div>
      
      {/* Actions section */}
      <div className="grid gap-px bg-slate-200 dark:bg-slate-800 md:grid-cols-2">
        <div className="bg-white dark:bg-slate-950">
          <ActionGroup
            title={t("shared.page.allowedActions") ?? "Hành động được phép"}
            items={allowedActions}
            tone="emerald"
            emptyLabel={t("shared.none") ?? "Không có"}
          />
        </div>
        <div className="bg-white dark:bg-slate-950">
          <ActionGroup
            title={t("shared.page.forbiddenActions") ?? "Hành động bị cấm"}
            items={forbiddenActions}
            tone="rose"
            emptyLabel={t("shared.none") ?? "Không có"}
          />
        </div>
      </div>
    </div>
  );
}

function ActionGroup({
  title,
  items,
  tone,
  emptyLabel
}: {
  title: string;
  items: string[];
  tone: "emerald" | "rose";
  emptyLabel: string;
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/30 px-4 py-2 shrink-0">
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
          {title}
        </div>
      </div>
      <div className="px-4 py-2 grow flex flex-wrap gap-1.5 content-start">
        {items.length ? (
          items.map((item) => (
            <span
              key={item}
              className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                tone === "emerald"
                  ? "bg-emerald-100/80 border-emerald-200 text-emerald-800 dark:bg-emerald-500/20 dark:border-emerald-500/30 dark:text-emerald-300"
                  : "bg-rose-100/80 border-rose-200 text-rose-800 dark:bg-rose-500/20 dark:border-rose-500/30 dark:text-rose-300"
              }`}
            >
              {item}
            </span>
          ))
        ) : (
          <span className="text-xs text-slate-500 dark:text-slate-400">{emptyLabel}</span>
        )}
      </div>
    </div>
  );
}
