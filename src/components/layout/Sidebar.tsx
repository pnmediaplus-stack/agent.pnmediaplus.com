"use client";

import Link from "next/link";
import type { Route } from "next";
import type { ComponentType } from "react";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/useI18n";
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
  Network,
  Megaphone,
  Workflow as WorkflowIcon,
  LifeBuoy,
  ShieldAlert,
  Scale
} from "lucide-react";

const navItems: { href: Route; labelKey: string; fallbackLabel: string; icon: ComponentType<{ className?: string }> }[] = [
  { href: "/dashboard", labelKey: "nav.dashboard", fallbackLabel: "Dashboard", icon: LayoutDashboard },
  { href: "/phase3", labelKey: "nav.phase3", fallbackLabel: "Phase 3", icon: Workflow },
  { href: "/phase4", labelKey: "nav.phase4", fallbackLabel: "Phase 4", icon: MonitorPlay },
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

export function Sidebar() {
  const pathname = usePathname();
  const { t: tShared } = useI18n("shared");
  const { t: tLayout } = useI18n("layout");

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
    </aside>
  );
}
