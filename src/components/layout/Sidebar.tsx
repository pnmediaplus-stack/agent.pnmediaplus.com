"use client";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ThemeSettingsModal } from "@/components/layout/ThemeSettingsModal";
import { useState, useEffect } from "react";
import Link from "next/link";
import type { Route } from "next";
import type { ComponentType } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/useI18n";
import { usePortalSession } from "@/components/layout/PortalSessionProvider";
import { useThemeStore, isValidHexColor } from "@/store/useThemeStore";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Headset,
  MessageSquareText,
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
  PlugZap,
  Settings
} from "lucide-react";

type NavItem = { href: Route; labelKey: string; fallbackLabel: string; icon: ComponentType<{ className?: string }> };
type NavGroup = { title: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    title: "Main",
    items: [
      { href: "/dashboard", labelKey: "nav.dashboard", fallbackLabel: "Dashboard", icon: LayoutDashboard },
      { href: "/omnichannel" as Route, labelKey: "nav.omnichannel", fallbackLabel: "Omnichannel CSKH", icon: Headset },
      { href: "/omnichannel/knowledge" as Route, labelKey: "nav.knowledge", fallbackLabel: "Kho tri thức AI", icon: FolderKanban },
      { href: "/chat", labelKey: "nav.chat", fallbackLabel: "Chat", icon: MessageSquareText },
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
  const { theme } = useTheme();
  const [logoutState, setLogoutState] = useState<"idle" | "loading" | "blocked">("idle");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);

  const [mounted, setMounted] = useState(false);
  const {
    sidebarBgType,
    sidebarBgColor,
    sidebarBgGradient,
    sidebarBgImageUrl,
    sidebarBgImageOpacity,
    sidebarTextColor
  } = useThemeStore();

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const validSidebarTextColor = mounted && isValidHexColor(sidebarTextColor) && sidebarTextColor ? sidebarTextColor : undefined;
  const isDarkSidebar = (mounted && sidebarBgType !== "default") || theme === "dark";

  const sidebarStyle: React.CSSProperties = {
    ...(validSidebarTextColor ? { color: validSidebarTextColor } : {}),
    ...(mounted && sidebarBgType === "color" && sidebarBgColor ? { backgroundColor: sidebarBgColor } : {}),
    ...(mounted && sidebarBgType === "gradient" && sidebarBgGradient ? { backgroundImage: sidebarBgGradient } : {})
  };

  return (
    <aside 
      style={sidebarStyle}
      className={`flex flex-col relative px-3 py-4 lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:h-screen lg:w-[290px] lg:border-b-0 lg:border-r lg:border-slate-200/50 dark:lg:border-slate-800/60 lg:overflow-y-auto shadow-xl shadow-slate-200/20 dark:shadow-black/20 ${
        mounted && sidebarBgType !== "default"
          ? "border-r-white/10 dark:border-r-white/5"
          : "bg-gradient-to-b from-violet-50/70 via-purple-50/40 to-fuchsia-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-violet-950/30"
      }`}
    >

      {/* Sidebar Custom Background Image Layer */}
      {mounted && sidebarBgType === "image" && sidebarBgImageUrl && (
        <div
          className="fixed inset-y-0 left-0 w-[290px] -z-10 bg-cover bg-center bg-no-repeat transition-opacity duration-300 pointer-events-none"
          style={{ 
            backgroundImage: `url(${sidebarBgImageUrl})`, 
            opacity: sidebarBgImageOpacity / 100 
          }} 
        />
      )}

      <div className="relative z-0 flex flex-col min-h-full w-full justify-between">

        {/* ── BRAND ─────────────────────────────────── */}
        <div className="mb-6 px-2">
          <div className={`text-[10px] font-bold uppercase tracking-[0.4em] ${
            isDarkSidebar ? "text-cyan-300" : "text-violet-600 dark:text-violet-400"
          }`}>
            {tLayout("layout.brand.name") ?? "PN OS AI Department"}
          </div>
          <div className={`mt-1.5 text-base font-semibold ${
            isDarkSidebar ? "text-white" : "text-slate-900 dark:text-white/90"
          }`}>
            {tLayout("layout.brand.phase") ?? "Phase 1 Internal MVP"}
          </div>
          <div className={`mt-2 h-px ${
            isDarkSidebar ? "bg-white/20" : "bg-gradient-to-r from-violet-300 via-fuchsia-200 to-transparent dark:from-violet-500/40 dark:via-slate-600/30 dark:to-transparent"
          }`} />
        </div>

        {/* ── NAV ───────────────────────────────────── */}
        <nav className="flex flex-1 gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
          <div className="flex flex-col gap-5 w-full">
            {navGroups.map((group) => (
              <div key={group.title} className="flex flex-col gap-0.5 w-full">
                <div className={`px-3 mb-1 text-[10px] font-semibold uppercase tracking-[0.3em] lg:block hidden ${
                  isDarkSidebar ? "text-white/70" : "text-slate-500/80 dark:text-slate-500"
                }`}>
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
                          ? isDarkSidebar
                            ? "bg-white/20 text-white font-semibold border-l-2 border-cyan-400 pl-[10px] shadow-sm backdrop-blur-sm"
                            : "bg-white/80 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300 font-semibold border-l-2 border-violet-600 dark:border-violet-500 pl-[10px] shadow-sm ring-1 ring-violet-200/60 dark:ring-0"
                          : isDarkSidebar
                            ? "text-white/80 border-l-2 border-transparent pl-[10px] hover:bg-white/10 hover:text-white"
                            : "text-slate-600 dark:text-slate-400 border-l-2 border-transparent pl-[10px] hover:bg-white/50 dark:hover:bg-white/5 hover:text-violet-900 dark:hover:text-white"
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 transition-colors ${
                        active
                          ? isDarkSidebar ? "text-cyan-300" : "text-violet-600 dark:text-violet-400"
                          : isDarkSidebar ? "text-white/60 group-hover:text-white" : "text-slate-400 dark:text-slate-500 group-hover:text-violet-600 dark:group-hover:text-violet-400"
                      }`} />
                      <span className="truncate">{tShared(`shared.${item.labelKey}`) ?? item.fallbackLabel}</span>
                      {active && (
                        <span className={`ml-auto h-1.5 w-1.5 rounded-full shrink-0 ${
                          isDarkSidebar ? "bg-cyan-300" : "bg-violet-500 dark:bg-violet-400"
                        }`} />
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </nav>

        {/* ── USER CARD & POPUP ─────────────────────────────── */}
        <div className="relative mt-4 shrink-0">
          {/* Floating Upward Popover Menu */}
          {accountMenuOpen && (
            <div className={`sidebar-menu-protected absolute bottom-full mb-3 left-0 right-0 z-50 rounded-2xl border p-3 shadow-2xl flex flex-col gap-2 transition-all animate-in fade-in slide-in-from-bottom-2 duration-150 ${
              isDarkSidebar
                ? "bg-slate-900 border-slate-700/80 text-white shadow-black/80"
                : "bg-white border-slate-200 text-slate-900 shadow-slate-400/30"
            }`}>
              <ThemeSettingsModal
                trigger={
                  <div className={`flex w-full items-center justify-between px-3 py-2 rounded-xl border cursor-pointer transition-colors group ${
                    isDarkSidebar
                      ? "bg-slate-800/90 hover:bg-slate-800 border-slate-700/80 text-slate-100"
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-800"
                  }`}>
                    <span className="text-xs font-semibold group-hover:text-cyan-500 transition-colors">{tLayout("layout.theme.toggle") ?? "Giao diện (Theme)"}</span>
                    <Settings className="h-3.5 w-3.5 text-slate-400 group-hover:text-cyan-500 transition-colors" />
                  </div>
                }
              />
              <button
                type="button"
                onClick={handleLogout}
                disabled={logoutState === "loading"}
                className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  isDarkSidebar
                    ? "bg-slate-800/90 hover:bg-rose-500/20 border-slate-700/80 hover:border-rose-500/40 text-slate-100 hover:text-rose-300"
                    : "bg-slate-50 hover:bg-rose-50 border-slate-200 hover:border-rose-200 text-slate-800 hover:text-rose-600"
                }`}
              >
                <LogOut className="h-3.5 w-3.5" />
                {logoutState === "loading"
                  ? (tLayout("layout.sidebar.logout.loading") ?? "Logging out")
                  : (tLayout("layout.sidebar.logout.action") ?? "Logout")}
              </button>

              {logoutState === "blocked" ? (
                <div className="mt-1 rounded-lg border border-rose-200 dark:border-rose-400/30 bg-rose-50 dark:bg-rose-400/10 px-2 py-1.5 text-[11px] text-rose-600 dark:text-rose-300">
                  {tLayout("layout.sidebar.logout.error") ?? "Logout failed."}
                </div>
              ) : null}

              <div className={`mt-1 border-t pt-2.5 ${isDarkSidebar ? "border-slate-800" : "border-slate-100"}`}>
                <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] ${
                  isDarkSidebar ? "text-cyan-400" : "text-violet-600"
                }`}>
                  <PlugZap className="h-3.5 w-3.5" />
                  {tLayout("layout.sidebar.integrations.title") ?? "Future integrations"}
                </div>
                <div className={`mt-1 text-[11px] ${isDarkSidebar ? "text-slate-400" : "text-slate-500"}`}>
                  {tLayout("layout.sidebar.integrations.description") ?? "Disabled slots for future provider settings."}
                </div>
                <div className="mt-2.5 grid gap-1.5">
                  {futureIntegrations.map((item) => (
                    <button
                      key={item.labelKey}
                      type="button"
                      disabled
                      className={`flex cursor-not-allowed items-center justify-between rounded-xl border px-3 py-2 text-left text-[11px] font-medium ${
                        isDarkSidebar
                          ? "bg-slate-800/60 border-slate-700/60 text-slate-300"
                          : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <span>{tLayout(item.labelKey) ?? item.fallbackLabel}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] font-semibold ${
                        isDarkSidebar
                          ? "bg-slate-800 border-slate-700 text-slate-400"
                          : "bg-slate-200 border-slate-300 text-slate-600"
                      }`}>
                        {tLayout("layout.sidebar.integrations.disabled") ?? "Disabled"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* User Card Trigger */}
          <div className={`rounded-xl p-2.5 text-xs shadow-sm transition-all ${
            isDarkSidebar ? "bg-white/10 text-white" : "bg-black/5 text-slate-900"
          }`}>
            <div className="flex items-start justify-between gap-2.5">
              <div className="min-w-0">
                <div className={`text-[10px] font-semibold uppercase tracking-[0.28em] ${
                  isDarkSidebar ? "text-white/70" : "text-slate-500"
                }`}>
                  {portalSession.state === "ready"
                    ? (tLayout("layout.sidebar.userCard.titleReady") ?? "Signed in")
                    : (tLayout("layout.sidebar.userCard.titleBlocked") ?? "Portal blocked")}
                </div>
                <div className={`mt-1 truncate font-semibold ${
                  isDarkSidebar ? "text-white" : "text-slate-900"
                }`}>
                  {portalSession.state === "ready" ? portalSession.organizationName : (tShared("shared.portal.blocked") ?? "Portal blocked")}
                </div>
                <div className={`mt-0.5 truncate text-[11px] ${
                  isDarkSidebar ? "text-white/80" : "text-slate-600"
                }`}>
                  {portalSession.state === "ready"
                    ? `${portalSession.role}${portalSession.email ? ` · ${portalSession.email}` : ""}`
                    : (tLayout("layout.sidebar.userCard.subtitleBlocked") ?? "Login required to access the portal")}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAccountMenuOpen((current) => !current)}
                aria-expanded={accountMenuOpen}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition shrink-0 ${
                  isDarkSidebar
                    ? "bg-white/20 hover:bg-white/30 text-white hover:text-cyan-200"
                    : "bg-black/10 hover:bg-black/15 text-slate-700 hover:text-cyan-600"
                }`}
              >
                {tLayout("layout.sidebar.accountMenu.action") ?? "Setting"}
              </button>
            </div>
          </div>
        </div>

      </div>
    </aside>
  );
}
