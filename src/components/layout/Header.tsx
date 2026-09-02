"use client";

import { hasSupabaseConfig } from "@/lib/supabase-client";
import { useI18n } from "@/lib/i18n/useI18n";
import { usePortalSession } from "@/components/layout/PortalSessionProvider";

export function Header() {
  const usingSupabase = hasSupabaseConfig();
  const { t: tShared, locale, setLocale } = useI18n("shared");
  const { t: tLayout } = useI18n("layout");
  const portalSession = usePortalSession();

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-950/70 shadow-sm shadow-slate-200/50 dark:shadow-none backdrop-blur-md px-5 py-4">
      <div>
        <div className="text-sm font-medium text-slate-900 dark:text-white">{tLayout("layout.header.title") ?? "agent.pnmediaplus.com"}</div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{tLayout("layout.header.description") ?? "Next.js shell with live data surfaces and safe server routes."}</p>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`max-w-[18rem] truncate rounded-full border px-3 py-1 text-xs ${
            portalSession.state === "ready"
              ? "border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-100"
              : portalSession.state === "blocked"
                ? "border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-100"
                : "border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300"
          }`}
          title={portalSession.state === "ready" ? `${portalSession.email} · ${portalSession.organizationName} · ${portalSession.role}` : portalSession.state === "blocked" ? portalSession.reason : undefined}
        >
          {portalSession.state === "ready"
            ? `${portalSession.organizationName} · ${portalSession.role}`
            : portalSession.state === "blocked"
              ? (tShared("shared.portal.blocked") ?? "Portal blocked")
              : (tShared("shared.portal.loading") ?? "Portal loading")}
        </span>
        <span className="rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 px-3 py-1 text-xs text-slate-600 dark:text-slate-300">
          {usingSupabase ? (tShared("shared.badge.supabaseConnected") ?? "Supabase connected") : (tShared("shared.badge.mockRegistryMode") ?? "Mock registry mode")}
        </span>
        <span className="rounded-full border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 text-xs text-emerald-700 dark:text-emerald-200">
          {tShared("shared.badge.humanAuthorityPreserved") ?? "Human authority preserved"}
        </span>
        <div className="flex items-center rounded-full border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 p-1 text-xs text-slate-600 dark:text-slate-300">
          <span className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-500">
            {tShared("shared.locale.label") ?? "Language"}
          </span>
          <button
            type="button"
            onClick={() => setLocale?.("en")}
            className={`rounded-full px-2.5 py-1 font-semibold transition ${locale === "en" ? "bg-cyan-500/10 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-200" : "hover:bg-slate-200 dark:hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"}`}
            aria-pressed={locale === "en"}
          >
            {tShared("shared.locale.en") ?? "EN"}
          </button>
          <button
            type="button"
            onClick={() => setLocale?.("vi")}
            className={`rounded-full px-2.5 py-1 font-semibold transition ${locale === "vi" ? "bg-cyan-500/10 dark:bg-cyan-500/15 text-cyan-600 dark:text-cyan-200" : "hover:bg-slate-200 dark:hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"}`}
            aria-pressed={locale === "vi"}
          >
            {tShared("shared.locale.vi") ?? "VI"}
          </button>
        </div>
      </div>
    </header>
  );
}
