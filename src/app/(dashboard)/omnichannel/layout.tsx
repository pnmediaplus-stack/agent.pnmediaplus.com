"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Inbox, Library } from "lucide-react";

export default function OmnichannelLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const tabs = [
    {
      name: "Inbox",
      href: "/omnichannel",
      icon: Inbox,
      active: pathname === "/omnichannel",
    },
    {
      name: "Kho Tri thức AI",
      href: "/omnichannel/knowledge",
      icon: Library,
      active: pathname === "/omnichannel/knowledge",
    },
  ];

  return (
    <div className="flex h-full w-full overflow-hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
      {/* Sub-sidebar for Omnichannel Workspace */}
      <div className="w-14 flex flex-col items-center py-4 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 space-y-4">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            title={tab.name}
            className={`p-2.5 rounded-lg transition-colors ${
              tab.active
                ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400"
                : "text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800"
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span className="sr-only">{tab.name}</span>
          </Link>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}
