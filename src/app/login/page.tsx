"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { Eye, EyeOff } from "lucide-react";
import { useI18n } from "@/lib/i18n/useI18n";

type LoginState = "idle" | "loading" | "blocked";

const REMEMBERED_EMAIL_KEY = "pn_os_portal_remembered_email";

type PortalSessionResponse = {
  ok?: boolean;
  state?: "ready" | "blocked";
  error?: string;
  message?: string;
  organization_context?: {
    reason?: string;
  };
};

function getBlockedReason(payload: PortalSessionResponse) {
  return payload.organization_context?.reason ?? payload.error ?? payload.message ?? null;
}

export default function LoginPage() {
  const { t } = useI18n("portalAuth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [state, setState] = useState<LoginState>("idle");
  const [error, setError] = useState<string | null>(null);
  const passwordToggleLabel = showPassword ? (t("login.password.hide") ?? "Hide password") : (t("login.password.show") ?? "Show password");
  const PasswordToggleIcon = showPassword ? Eye : EyeOff;

  useEffect(() => {

    const rememberedEmail = window.localStorage.getItem(REMEMBERED_EMAIL_KEY);

    if (rememberedEmail) {
      setEmail(rememberedEmail as string);
      setRememberEmail(true);
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password
        })
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        setState("blocked");
        setError(typeof payload?.error === "string" ? payload.error : (t("login.error.generic") ?? "Login failed."));
        return;
      }

      const sessionResponse = await fetch("/api/auth/session", {
        method: "GET",
        cache: "no-store",
        credentials: "include"
      });
      const sessionPayload = (await sessionResponse.json().catch(() => ({}))) as PortalSessionResponse;

      if (!sessionResponse.ok || sessionPayload.state !== "ready") {
        const blockedReason = getBlockedReason(sessionPayload);
        setState("blocked");
        setError(
          blockedReason === "PORTAL_ORGANIZATION_MEMBERSHIP_MISSING"
            ? t("login.error.membershipMissing") ?? "PORTAL_ORGANIZATION_MEMBERSHIP_MISSING"
            : blockedReason ?? (t("login.error.sessionVerification") ?? "Portal session verification failed.")
        );
        return;
      }

      if (rememberEmail) {
        window.localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      } else {
        window.localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }

      const nextPath = searchParams.get("next");
      const safeNextPath = nextPath?.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard";
      router.replace(safeNextPath as Route);
      router.refresh();
    } catch (caught) {
      setState("blocked");
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.12),_transparent_34%),linear-gradient(135deg,_#f8fafc,_#f1f5f9_52%,_#e2e8f0)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.14),_transparent_34%),linear-gradient(135deg,_#020617,_#0f172a_52%,_#111827)] px-5 py-10 text-slate-900 dark:text-slate-100">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-[2rem] border border-indigo-100 dark:border-indigo-900/30 bg-white dark:bg-slate-950/65 p-8 shadow-xl shadow-slate-200/50 dark:shadow-2xl dark:shadow-indigo-950/20">
          <div className="text-xs font-bold uppercase tracking-[0.34em] text-indigo-600 dark:text-indigo-400">
            {t("login.kicker") ?? "PN OS Portal"}
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {t("login.title") ?? "Internal access only"}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            {t("login.description") ?? "Sign in with an approved Supabase Auth user. Self-signup is disabled and sensitive routes fail closed without a valid session."}
          </p>
          <div className="mt-8 grid gap-3 text-sm text-slate-700 dark:text-slate-300">
            {[0, 1, 2].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 px-4 py-3">
                {t(`login.guardrail.${item}`) ?? "Portal guardrail"}
              </div>
            ))}
          </div>
        </section>

        <form className="rounded-[2rem] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/85 p-6 shadow-xl shadow-slate-200/50 dark:shadow-2xl dark:shadow-slate-950/40" onSubmit={handleSubmit}>
          <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
            <div className="text-lg font-semibold text-slate-900 dark:text-white">{t("login.form.title") ?? "Sign in"}</div>
            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("login.form.description") ?? "No self-signup. Use an approved internal account."}</div>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="grid gap-2 text-sm" htmlFor="portal-email">
              <span className="font-semibold text-slate-700 dark:text-slate-200">{t("login.field.email") ?? "Email"}</span>
              <input
                id="portal-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-slate-900 dark:text-slate-100 outline-none ring-indigo-500/30 dark:ring-indigo-400/30 transition placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2"
                placeholder={t("login.placeholder.email") ?? "you@example.com"}
              />
            </label>

            <label className="grid gap-2 text-sm" htmlFor="portal-password">
              <span className="font-semibold text-slate-700 dark:text-slate-200">{t("login.field.password") ?? "Password"}</span>
              <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 ring-indigo-500/30 dark:ring-indigo-400/30 transition focus-within:border-indigo-500 dark:focus-within:border-indigo-400 focus-within:ring-2">
                <input
                  id="portal-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="min-w-0 flex-1 rounded-l-xl bg-transparent px-3.5 py-2.5 text-slate-900 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  placeholder={t("login.placeholder.password") ?? "Password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="grid w-11 place-items-center rounded-r-xl border-l border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 transition hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-pressed={showPassword}
                  aria-label={passwordToggleLabel}
                  title={passwordToggleLabel}
                >
                  <PasswordToggleIcon className="h-4 w-4" />
                </button>
              </div>
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300" htmlFor="portal-remember-email">
              <input
                id="portal-remember-email"
                type="checkbox"
                checked={rememberEmail}
                onChange={(event) => setRememberEmail(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 focus:ring-indigo-500"
              />
              <span>{t("login.rememberEmail") ?? "Remember email on this device"}</span>
            </label>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-rose-200 dark:border-rose-400/30 bg-rose-50 dark:bg-rose-400/10 px-4 py-3 text-sm text-rose-600 dark:text-rose-100">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={state === "loading"}
            className="mt-6 w-full rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-extrabold text-sm px-4 py-3 shadow-md transition-all active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            {state === "loading" ? (t("login.action.loading") ?? "Signing in...") : (t("login.action.submit") ?? "Sign in")}
          </button>
        </form>
      </div>
    </main>
  );
}
