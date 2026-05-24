"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PortalSessionProvider } from "@/components/layout/PortalSessionProvider";

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <PortalSessionProvider redirectPath={pathname}>
      <AppShell>{children}</AppShell>
    </PortalSessionProvider>
  );
}
