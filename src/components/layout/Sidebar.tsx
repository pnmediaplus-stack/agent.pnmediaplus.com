"use client";

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

const navItems: { href: Route; labelKey: string; fallbackLabel: string; icon: ComponentType<{ className?: string }> }[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", fallbackLabel: "Dashboard", icon: LayoutDashboard },
  { href: "/phase3", labelKey: "nav.phase3", fallbackLabel: "Phase 3", icon: Workflow },
  { href: "/phase4", labelKey: "nav.phase4", fallbackLabel: "Phase 4", icon: MonitorPlay },
  { href: "/phase066/evidence", labelKey: "nav.phase066Evidence", fallbackLabel: "Phase 066 Evidence", icon: ClipboardCheck },
  { href: "/phase067/leads", labelKey: "nav.phase067Leads", fallbackLabel: "Phase 067 Leads", icon: UsersRound },
  { href: "/phase068/portal", labelKey: "nav.phase068Portal", fallbackLabel: "Phase 068 Portal", icon: Boxes },
  { href: "/tenant-integrations", labelKey: "nav.tenantIntegrations", fallbackLabel: "Tenant Integrations", icon: KeyRound },
  { href: "/department-governance", labelKey: "nav.departmentGovernance", fallbackLabel: "Department Governance", icon: Network },
  { href: "/marketing", labelKey: "nav.marketing", fallbackLabel: "Marketing", icon: Megaphone },
  { href: "/operations", labelKey: "nav.operations", fallbackLabel: "Operations", icon: WorkflowIcon },
  { href: "/customer", labelKey: "nav.customer", fallbackLabel: "Customer", icon: LifeBuoy },
  { href: "/business-truth", labelKey: "nav.businessTruth", fallbackLabel: "Business Truth", icon: ShieldAlert },
  { href: "/core-governance", labelKey: "nav.coreGovernance", fallbackLabel: "Core Governance", icon: Scale },
  { href: "/chat", labelKey: "nav.chat", fallbackLabel: "Chat", icon: MessagesSquare },
  { href: "/departments", labelKey: "nav.departments", fallbackLabel: "Departments", icon: Building2 },
  { href: "/agents", labelKey: "nav.agents", fallbackLabel: "Agents", icon: Bot },
  { href: "/tasks", labelKey: "nav.tasks", fallbackLabel: "Tasks", icon: ListTodo },
  { href: "/artifacts", labelKey: "nav.artifacts", fallbackLabel: "Artifacts", icon: FolderKanban },
  { href: "/workflows", labelKey: "nav.workflows", fallbackLabel: "Workflows", icon: Workflow },
  { href: "/qa-reviews", labelKey: "nav.qaReviews", fallbackLabel: "QA Reviews", icon: ShieldCheck },
  { href: "/gates", labelKey: "nav.gates", fallbackLabel: "Gates", icon: Gavel },
  { href: "/approvals", labelKey: "nav.approvals", fallbackLabel: "Approvals", icon: BadgeCheck },
  { href: "/n8n-runs", labelKey: "nav.n8nRuns", fallbackLabel: "n8n Runs", icon: MonitorPlay },
  { href: "/audit-logs", labelKey: "nav.auditLogs", fallbackLabel: "Audit Logs", icon: ScrollText },
  { href: "/media-pipeline", labelKey: "nav.mediaPipeline", fallbackLabel: "Media Pipeline", icon: Clapperboard }
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
    <aside className="flex h-full flex-col border-b border-slate-800 bg-slate-950/90 px-4 py-4 lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:h-screen lg:w-[290px] lg:border-b-0 lg:border-r lg:overflow-y-auto">
      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300/80">{tLayout("layout.brand.name") ?? "PN OS AI Department"}</div>
        <div className="mt-2 text-lg font-semibold text-white">{tLayout("layout.brand.phase") ?? "Phase 1 Internal MVP"}</div>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400 lg:max-w-none">{tLayout("layout.brand.tagline") ?? "Thin-shell UI for commands, registry state, approvals, and workflow monitoring."}</p>
      </div>
      <nav className="flex flex-1 gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-max items-center gap-3 rounded-xl px-3 py-2 text-sm transition lg:min-w-0 ${
                active
                  ? "bg-cyan-500/10 text-cyan-200 ring-1 ring-cyan-500/30"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tShared(`shared.${item.labelKey}`) ?? item.fallbackLabel}
            </Link>
          );
        })}
      </nav>
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs leading-5 text-slate-400">
        {tLayout("layout.sidebar.noPublishLaunch") ?? "No publish or launch actions are wired in Phase 1."}
      </div>
      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3 text-xs leading-5 text-slate-300 lg:mt-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              {portalSession.state === "ready"
                ? (tLayout("layout.sidebar.userCard.titleReady") ?? "Signed in")
                : (tLayout("layout.sidebar.userCard.titleBlocked") ?? "Portal blocked")}
            </div>
            <div className="mt-2 truncate font-semibold text-white">
              {portalSession.state === "ready" ? portalSession.organizationName : (tShared("shared.portal.blocked") ?? "Portal blocked")}
            </div>
            <div className="mt-1 truncate text-slate-400">
              {portalSession.state === "ready"
                ? `${portalSession.role}${portalSession.email ? ` · ${portalSession.email}` : ""}`
                : (tLayout("layout.sidebar.userCard.subtitleBlocked") ?? "Login required to access the portal")}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAccountMenuOpen((current) => !current)}
            aria-expanded={accountMenuOpen}
            className="rounded-lg border border-slate-700 bg-slate-950/70 px-2.5 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-300/50 hover:text-cyan-100"
          >
            {tLayout("layout.sidebar.accountMenu.action") ?? "Setting"}
          </button>
        </div>
        {accountMenuOpen ? (
          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/80 p-2 shadow-xl shadow-slate-950/30">
            <button
              type="button"
              onClick={handleLogout}
              disabled={logoutState === "loading"}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-rose-300/50 hover:bg-rose-400/10 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut className="h-3.5 w-3.5" />
              {logoutState === "loading"
                ? (tLayout("layout.sidebar.logout.loading") ?? "Logging out")
                : (tLayout("layout.sidebar.logout.action") ?? "Logout")}
            </button>
            {logoutState === "blocked" ? (
              <div className="mt-2 rounded-lg border border-rose-400/30 bg-rose-400/10 px-2 py-1.5 text-[11px] text-rose-100">
                {tLayout("layout.sidebar.logout.error") ?? "Logout failed."}
              </div>
            ) : null}
            <div className="mt-3 border-t border-slate-800 pt-3">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                <PlugZap className="h-3.5 w-3.5" />
                {tLayout("layout.sidebar.integrations.title") ?? "Future integrations"}
              </div>
              <div className="mt-2 text-[11px] text-slate-500">
                {tLayout("layout.sidebar.integrations.description") ?? "Disabled placeholders for future provider settings."}
              </div>
              <div className="mt-3 grid gap-1.5">
                {futureIntegrations.map((item) => (
                  <button
                    key={item.labelKey}
                    type="button"
                    disabled
                    className="flex cursor-not-allowed items-center justify-between rounded-lg border border-slate-800 bg-slate-950/55 px-2.5 py-2 text-left text-[11px] text-slate-500"
                  >
                    <span>{tLayout(item.labelKey) ?? item.fallbackLabel}</span>
                    <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-600">
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
