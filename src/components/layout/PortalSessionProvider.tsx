"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/useI18n";

type PortalSessionReady = {
  state: "ready";
  email: string;
  organizationName: string;
  role: string;
};

type PortalSessionBlocked = {
  state: "blocked";
  reason: string;
};

type PortalSessionLoading = {
  state: "loading";
};

export type PortalSessionState = PortalSessionReady | PortalSessionBlocked | PortalSessionLoading;

type PortalSessionPayload = {
  state?: "ready" | "blocked";
  message?: string;
  user?: {
    email?: unknown;
  };
  organization_context?: {
    reason?: unknown;
    active_membership?: {
      organization_name?: unknown;
      role?: unknown;
    };
  };
};

const PortalSessionContext = createContext<PortalSessionState>({ state: "loading" });

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function normalizeSessionPayload(response: Response, payload: PortalSessionPayload): PortalSessionReady | PortalSessionBlocked {
  if (!response.ok || payload.state !== "ready") {
    return {
      state: "blocked",
      reason:
        readString(payload.organization_context?.reason) ||
        readString(payload.message) ||
        "PORTAL_SESSION_BLOCKED"
    };
  }

  return {
    state: "ready",
    email: readString(payload.user?.email),
    organizationName: readString(payload.organization_context?.active_membership?.organization_name),
    role: readString(payload.organization_context?.active_membership?.role)
  };
}

export function PortalSessionProvider({ children, redirectPath }: { children: ReactNode; redirectPath: string }) {
  const router = useRouter();
  const { t } = useI18n("shared");
  const redirectPathRef = useRef(redirectPath);
  const [portalSession, setPortalSession] = useState<PortalSessionState>({ state: "loading" });

  useEffect(() => {
    redirectPathRef.current = redirectPath;
  }, [redirectPath]);

  useEffect(() => {
    let active = true;

    async function loadPortalSession() {
      try {
        const response = await fetch("/api/auth/session", {
          method: "GET",
          cache: "no-store",
          credentials: "include"
        });
        const payload = (await response.json().catch(() => ({}))) as PortalSessionPayload;

        if (!active) return;

        const nextSession = normalizeSessionPayload(response, payload);
        setPortalSession(nextSession);

        if (nextSession.state === "blocked") {
          router.replace(`/login?next=${encodeURIComponent(redirectPathRef.current)}`);
        }
      } catch (error) {
        if (!active) return;
        setPortalSession({
          state: "blocked",
          reason: error instanceof Error ? error.message : String(error)
        });
        router.replace(`/login?next=${encodeURIComponent(redirectPathRef.current)}`);
      }
    }

    void loadPortalSession();

    return () => {
      active = false;
    };
  }, [router]);

  const value = useMemo(() => portalSession, [portalSession]);

  if (portalSession.state !== "ready") {
    return (
      <PortalSessionContext.Provider value={value}>
        <div className="grid min-h-screen place-items-center bg-slate-950 px-6 text-slate-100">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-center shadow-2xl shadow-slate-950/40">
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
              {t("shared.shell.guardTitle") ?? "Portal guard"}
            </div>
            <div className="mt-3 text-lg font-semibold text-white">
              {portalSession.state === "blocked"
                ? t("shared.shell.blocked") ?? "Session blocked"
                : t("shared.shell.loading") ?? "Checking session"}
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {t("shared.shell.description") ?? "The private app shell mounts only after a valid portal session and active membership are confirmed."}
            </p>
          </div>
        </div>
      </PortalSessionContext.Provider>
    );
  }

  return <PortalSessionContext.Provider value={value}>{children}</PortalSessionContext.Provider>;
}

export function usePortalSession() {
  return useContext(PortalSessionContext);
}
