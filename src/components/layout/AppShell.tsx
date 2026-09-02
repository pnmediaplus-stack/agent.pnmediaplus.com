"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isFullViewport = pathname?.startsWith("/agents/marketing");

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_35%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] dark:text-slate-100 transition-colors duration-300">
      <div className="min-h-screen lg:pl-[290px]">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-col">
          <Header />
          <main 
            className={`min-h-0 flex-1 ${
              isFullViewport 
                ? "flex flex-col overflow-hidden" 
                : "overflow-x-hidden overflow-y-auto px-4 py-6 md:px-6 xl:px-8"
            }`}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

