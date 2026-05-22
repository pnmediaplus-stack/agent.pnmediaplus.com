"use client";

import { hasSupabaseConfig } from "@/lib/supabase-client";
import { useI18n } from "@/lib/i18n/useI18n";

export function Header() {
  const usingSupabase = hasSupabaseConfig();
  const { t: tShared, locale, setLocale } = useI18n("shared");
  const { t: tLayout } = useI18n("layout");

  return (
    <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/70 px-5 py-4 backdrop-blur">
      <div>
        <div className="text-sm font-medium text-white">{tLayout("layout.header.title") ?? "Localhost build"}</div>
        <p className="text-xs text-slate-400">{tLayout("layout.header.description") ?? "Next.js shell with mock-first data and safe server routes."}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300">
          {usingSupabase ? (tShared("shared.badge.supabaseConnected") ?? "Supabase connected") : (tShared("shared.badge.mockRegistryMode") ?? "Mock registry mode")}
        </span>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
          {tShared("shared.badge.humanAuthorityPreserved") ?? "Human authority preserved"}
        </span>
        <div className="flex items-center rounded-full border border-slate-700 bg-slate-900 p-1 text-xs text-slate-300">
          <span className="px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            {tShared("shared.locale.label") ?? "Language"}
          </span>
          <button
            type="button"
            onClick={() => setLocale?.("en")}
            className={`rounded-full px-2.5 py-1 font-semibold transition ${locale === "en" ? "bg-cyan-500/15 text-cyan-200" : "hover:bg-slate-800 hover:text-white"}`}
            aria-pressed={locale === "en"}
          >
            {tShared("shared.locale.en") ?? "EN"}
          </button>
          <button
            type="button"
            onClick={() => setLocale?.("vi")}
            className={`rounded-full px-2.5 py-1 font-semibold transition ${locale === "vi" ? "bg-cyan-500/15 text-cyan-200" : "hover:bg-slate-800 hover:text-white"}`}
            aria-pressed={locale === "vi"}
          >
            {tShared("shared.locale.vi") ?? "VI"}
          </button>
        </div>
      </div>
    </header>
  );
}
