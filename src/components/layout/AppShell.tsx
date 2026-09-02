"use client";
import { type ReactNode, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { useThemeStore, isValidHexColor } from "@/store/useThemeStore";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isFullViewport = pathname?.startsWith("/agents/marketing");
  const [mounted, setMounted] = useState(false);
  const { bgType, bgColor, bgGradient, bgImageUrl, bgImageOpacity, textColor } = useThemeStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const validTextColor = mounted && isValidHexColor(textColor) && textColor ? textColor : undefined;

  return (
    <div 
      style={validTextColor ? { color: validTextColor } : undefined}
      className={`min-h-screen text-slate-900 dark:text-slate-100 transition-colors duration-300 relative ${
        mounted && bgType !== "default" ? "bg-transparent" : "bg-slate-100 dark:bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_35%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)]"
      }`}
    >
      {/* Custom Background Layer */}
      {mounted && bgType === "color" && (
        <div className="fixed inset-0 -z-10" style={{ backgroundColor: bgColor }} />
      )}
      {mounted && bgType === "gradient" && (
        <div className="fixed inset-0 -z-10" style={{ backgroundImage: bgGradient }} />
      )}
      {mounted && bgType === "image" && bgImageUrl && (
        <div 
          className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat transition-opacity duration-300" 
          style={{ 
            backgroundImage: `url(${bgImageUrl})`, 
            opacity: bgImageOpacity / 100 
          }} 
        />
      )}

      {/* Main Content */}
      <div className="min-h-screen lg:pl-[290px] relative z-0">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-col bg-white/30 dark:bg-black/20">
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

