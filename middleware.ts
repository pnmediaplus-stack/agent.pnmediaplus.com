import { NextRequest, NextResponse } from "next/server";
import {
  CONTROL_PLANE_SESSION_COOKIE,
  createControlPlaneSessionCookieValue,
  verifyControlPlaneSessionCookieValue
} from "@/lib/control-plane-session";
import { loadPortalOrganizationContext, readPortalAccessToken, verifySupabaseAccessToken } from "@/lib/portal-auth";

const PROTECTED_MUTATION_API_PREFIXES = [
  "/api/phase066/evidence",
  "/api/n8n/human-task-intake",
  "/api/n8n/state-update-request",
  "/api/n8n/audit-log-append",
  "/api/byok/reference-token",
  "/api/byok/llm-proxy",
  "/api/tenant-integrations"
];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isProtectedMutationApiPath(pathname: string) {
  return matchesPrefix(pathname, PROTECTED_MUTATION_API_PREFIXES);
}

function unauthorizedResponse(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      {
        ok: false,
        state: "blocked",
        status: 401,
        message: "Portal session is required.",
        receivedAt: new Date().toISOString()
      },
      { status: 401 }
    );
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

async function ensureControlPlaneCookie(request: NextRequest, response: NextResponse) {
  const currentSession = request.cookies.get(CONTROL_PLANE_SESSION_COOKIE)?.value;
  const isValid = currentSession ? await verifyControlPlaneSessionCookieValue(currentSession) : null;

  if (isValid) return response;

  const sessionValue = await createControlPlaneSessionCookieValue("human:portal-session");
  response.cookies.set({
    name: CONTROL_PLANE_SESSION_COOKIE,
    value: sessionValue,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next/") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const portalAccessToken = readPortalAccessToken(request.headers);
  const portalUser = await verifySupabaseAccessToken(portalAccessToken);

  if (pathname === "/login" && portalUser) {
    const target = request.nextUrl.searchParams.get("next") || "/dashboard";
    return NextResponse.redirect(new URL(target, request.url));
  }

  const isApiPath = pathname.startsWith("/api/");
  const isLoginPage = pathname === "/login";

  // --- TEMPORARY AUTH BYPASS FOR LOCAL DEV ---
  const BYPASS_AUTH = true; // Always bypass for now based on user request
  if (BYPASS_AUTH) {
    if (isLoginPage) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    if (pathname.startsWith("/api/")) {
      return NextResponse.next();
    }
    return ensureControlPlaneCookie(request, NextResponse.next());
  }
  // -------------------------------------------

  if (!isApiPath && !isLoginPage) {
    if (!portalUser || !portalAccessToken) {
      return unauthorizedResponse(request);
    }

    const organizationContext = await loadPortalOrganizationContext(portalAccessToken, portalUser.id);
    if (organizationContext.state === "blocked") {
      return unauthorizedResponse(request);
    }
  }

  if (pathname.startsWith("/api/")) {
    if (isProtectedMutationApiPath(pathname) && (!portalUser || !portalAccessToken)) {
      return unauthorizedResponse(request);
    }
    return NextResponse.next();
  }

  return ensureControlPlaneCookie(request, NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
