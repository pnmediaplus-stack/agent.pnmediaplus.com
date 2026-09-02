"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, Library } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import type { Route } from "next";

export default function OmnichannelLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs: { name: string; href: Route; icon: any; active: boolean }[] = [
    {
      name: "Inbox",
      href: "/omnichannel" as Route,
      icon: Inbox,
      active: pathname === "/omnichannel",
    },
    {
      name: "Kho Tri thức AI",
      href: "/omnichannel/knowledge" as Route,
      icon: Library,
      active: pathname === "/omnichannel/knowledge",
    },
  ];

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] space-y-6">
      <PageHeader 
        title="Omnichannel CSKH"
        purpose="Quản lý và tương tác đa kênh tích hợp AI"
        statusLabel="Trạng thái"
        statusValue="OPEN"
        allowedActions={["view", "edit"]}
      />

      {/* Horizontal Tabs */}
      <div className="flex space-x-1 border-b border-slate-200 dark:border-slate-800 pb-px">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab.active
                ? "border-cyan-500 text-cyan-600 dark:border-cyan-400 dark:text-cyan-400"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-600"
            }`}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.name}
          </Link>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        {children}
      </div>
    </div>
  );
}
