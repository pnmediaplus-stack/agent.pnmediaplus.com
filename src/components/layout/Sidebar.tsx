"use client";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

import { useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import type { ComponentType } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/useI18n";
import { usePortalSession } from "@/components/layout/PortalSessionProvider";
import {
  LayoutDashboard,
  MessagesSquare,
  Building2,
  Bot,
  ListTodo,
  FolderKanban,
  Workflow,
  ShieldCheck,
  BadgeCheck,
  Gavel,
  MonitorPlay,
  ScrollText,
  Clapperboard,
  ClipboardCheck,
  UsersRound,
  Boxes,
  KeyRound,
  Network,
  Megaphone,
  Workflow as WorkflowIcon,
  LifeBuoy,
  ShieldAlert,
  Scale,
  LogOut,
  PlugZap
} from "lucide-react";

type NavItem = { href: Route; labelKey: string; fallbackLabel: string; icon: ComponentType<{ className?: string }> };
type NavGroup = { title: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    title: "Main",
    items: [
      { href: "/dashboard", labelKey: "nav.dashboard", fallbackLabel: "Dashboard", icon: LayoutDashboard },
      { href: "/omnichannel" as Route, labelKey: "nav.omnichannel", fallbackLabel: "Omnichannel CSKH", icon: MessagesSquare },
      { href: "/omnichannel/knowledge" as Route, labelKey: "nav.knowledge", fallbackLabel: "Kho tri thức AI", icon: FolderKanban },
      { href: "/chat", labelKey: "nav.chat", fallbackLabel: "Chat", icon: MessagesSquare },
      { href: "/media-pipeline", labelKey: "nav.mediaPipeline", fallbackLabel: "Media Pipeline", icon: Clapperboard }
    ]
  },
  {
    title: "Organization",
    items: [
      { href: "/departments", labelKey: "nav.departments", fallbackLabel: "Departments", icon: Building2 },
      { href: "/agents", labelKey: "nav.agents", fallbackLabel: "Agents", icon: Bot },
        { href: "/agents/marketing", labelKey: "nav.marketingAgent", fallbackLabel: "Marketing Agent", icon: Megaphone } as any,
      { href: "/tenant-integrations", labelKey: "nav.tenantIntegrations", fallbackLabel: "API Integrations", icon: PlugZap }
    ]
  },
  {
    title: "Execution",
    items: [
      { href: "/tasks", labelKey: "nav.tasks", fallbackLabel: "Tasks", icon: ListTodo },
      { href: "/artifacts", labelKey: "nav.artifacts", fallbackLabel: "Artifacts", icon: FolderKanban },
      { href: "/workflows", labelKey: "nav.workflows", fallbackLabel: "Workflows", icon: Workflow }
    ]
  },
  {
    title: "Governance",
    items: [
      { href: "/qa-reviews", labelKey: "nav.qaReviews", fallbackLabel: "QA Reviews", icon: ShieldCheck },
      { href: "/gates", labelKey: "nav.gates", fallbackLabel: "Gates", icon: Gavel },
      { href: "/approvals", labelKey: "nav.approvals", fallbackLabel: "Approvals", icon: BadgeCheck }
    ]
  },
  {
    title: "Observability",
    items: [
      { href: "/n8n-runs", labelKey: "nav.n8nRuns", fallbackLabel: "n8n Runs", icon: MonitorPlay },
      { href: "/audit-logs", labelKey: "nav.auditLogs", fallbackLabel: "Audit Logs", icon: ScrollText }
    ]
  }
];

const futureIntegrations: { labelKey: string; fallbackLabel: string }[] = [
  { labelKey: "layout.sidebar.integrations.openai", fallbackLabel: "OpenAI" },
  { labelKey: "layout.sidebar.integrations.gemini", fallbackLabel: "Gemini" },
  { labelKey: "layout.sidebar.integrations.apiSettings", fallbackLabel: "API settings" }
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t: tShared } = useI18n("shared");
  const { t: tLayout } = useI18n("layout");
  const portalSession = usePortalSession();
  const [logoutState, setLogoutState] = useState<"idle" | "loading" | "blocked">("idle");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  async function handleLogout() {
    setLogoutState("loading");

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        cache: "no-store",
        credentials: "include"
      });
      router.replace("/login");
      router.refresh();
    } catch {
      setLogoutState("blocked");
    }
  }

  return (
    <aside className="flex h-full flex-col bg-gradient-to-b from-slate-900 via-slate-900 to-violet-950 px-3 py-4 lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:h-screen lg:w-[272px] lg:border-b-0 lg:border-r lg:border-slate-800/60 lg:overflow-y-auto shadow-xl shadow-black/20">

      {/* ── BRAND ─────────────────────────────────── */}
      <div className="mb-6 px-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.4em] text-violet-400">
          {tLayout("layout.brand.name") ?? "PN OS AI Department"}
        </div>
        <div className="mt-1.5 text-base font-semibold text-white/90">
          {tLayout("layout.brand.phase") ?? "Phase 1 Internal MVP"}
        </div>
        <div className="mt-2 h-px bg-gradient-to-r from-violet-500/40 via-slate-600/30 to-transparent" />
      </div>

      {/* ── NAV ───────────────────────────────────── */}
      <nav className="flex flex-1 gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        <div className="flex flex-col gap-5 w-full">
          {navGroups.map((group) => (
            <div key={group.title} className="flex flex-col gap-0.5 w-full">
              <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500 lg:block hidden">
                {group.title}
              </div>
              {group.items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex min-w-max items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150 lg:min-w-0 ${
                      active
                        ? "bg-violet-500/15 text-violet-300 font-semibold border-l-2 border-violet-500 pl-[10px] shadow-sm"
                        : "text-slate-400 border-l-2 border-transparent pl-[10px] hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 transition-colors ${active ? "text-violet-400" : "text-slate-500 group-hover:text-violet-400"}`} />
                    <span className="truncate">{tShared(`shared.${item.labelKey}`) ?? item.fallbackLabel}</span>
                    {active && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </nav>

      {/* ── PHASE NOTE ────────────────────────────── */}
      <div className="mt-4 rounded-xl border border-white/5 bg-white/3 px-3 py-2.5 text-xs leading-5 text-slate-500">
        {tLayout("layout.sidebar.noPublishLaunch") ?? "No publish or launch actions are wired in Phase 1."}
      </div>

      {/* ── USER CARD ─────────────────────────────── */}
      <div className="mt-3 rounded-xl border border-white/8 bg-white/5 p-3 text-xs lg:mt-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              {portalSession.state === "ready"
                ? (tLayout("layout.sidebar.userCard.titleReady") ?? "Signed in")
                : (tLayout("layout.sidebar.userCard.titleBlocked") ?? "Portal blocked")}
            </div>
            <div className="mt-1.5 truncate font-semibold text-white/90">
              {portalSession.state === "ready" ? portalSession.organizationName : (tShared("shared.portal.blocked") ?? "Portal blocked")}
            </div>
            <div className="mt-0.5 truncate text-slate-400">
              {portalSession.state === "ready"
                ? `${portalSession.role}${portalSession.email ? ` · ${portalSession.email}` : ""}`
                : (tLayout("layout.sidebar.userCard.subtitleBlocked") ?? "Login required to access the portal")}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAccountMenuOpen((current) => !current)}
            aria-expanded={accountMenuOpen}
            className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-400 transition hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-violet-300"
          >
            {tLayout("layout.sidebar.accountMenu.action") ?? "Setting"}
          </button>
        </div>

        {accountMenuOpen ? (
          <div className="mt-3 rounded-xl border border-white/8 bg-slate-950/60 p-2 shadow-xl flex flex-col gap-2">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-xs font-semibold text-slate-400">{tLayout("layout.theme.toggle") ?? "Giao diện (Theme)"}</span>
              <ThemeToggle />
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutState === "loading"}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/8 bg-white/4 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-rose-500/40 hover:bg-rose-500/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut className="h-3.5 w-3.5" />
              {logoutState === "loading"
                ? (tLayout("layout.sidebar.logout.loading") ?? "Logging out")
                : (tLayout("layout.sidebar.logout.action") ?? "Logout")}
            </button>
            {logoutState === "blocked" ? (
              <div className="mt-2 rounded-lg border border-rose-400/30 bg-rose-400/10 px-2 py-1.5 text-[11px] text-rose-300">
                {tLayout("layout.sidebar.logout.error") ?? "Logout failed."}
              </div>
            ) : null}
            <div className="mt-3 border-t border-white/8 pt-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                <PlugZap className="h-3.5 w-3.5" />
                {tLayout("layout.sidebar.integrations.title") ?? "Future integrations"}
              </div>
              <div className="mt-2 text-[11px] text-slate-600">
                {tLayout("layout.sidebar.integrations.description") ?? "Disabled slots for future provider settings."}
              </div>
              <div className="mt-3 grid gap-1.5">
                {futureIntegrations.map((item) => (
                  <button
                    key={item.labelKey}
                    type="button"
                    disabled
                    className="flex cursor-not-allowed items-center justify-between rounded-lg border border-white/6 bg-white/3 px-2.5 py-2 text-left text-[11px] text-slate-600"
                  >
                    <span>{tLayout(item.labelKey) ?? item.fallbackLabel}</span>
                    <span className="rounded-full border border-white/8 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-600">
                      {tLayout("layout.sidebar.integrations.disabled") ?? "Disabled"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
