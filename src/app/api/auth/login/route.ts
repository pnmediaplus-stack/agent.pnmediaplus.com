import { NextResponse } from "next/server";
import { loginWithSupabasePassword, PORTAL_ACCESS_COOKIE, PORTAL_REFRESH_COOKIE } from "@/lib/portal-auth";

function json(status: number, body: Record<string, unknown>) {
  return NextResponse.json(
    {
      route: "portal-auth-login",
      status,
      ...body,
      receivedAt: new Date().toISOString()
    },
    { status }
  );
}

function stringField(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as { email?: unknown; password?: unknown };
  const email = stringField(payload.email);
  const password = stringField(payload.password);

  if (!email || !password) {
    return json(400, {
      ok: false,
      state: "blocked",
      message: "Email and password are required.",
      error: "PORTAL_AUTH_LOGIN_FIELDS_MISSING"
    });
  }

  const result = await loginWithSupabasePassword(email, password);

  if (result.state === "blocked") {
    return json(result.status, {
      ok: false,
      state: "blocked",
      message: "Portal login failed.",
      error: result.reason
    });
  }

  const response = json(200, {
    ok: true,
    state: "ready",
    message: "Portal session established.",
    user: result.user
  });

  response.cookies.set({
    name: PORTAL_ACCESS_COOKIE,
    value: result.accessToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: result.expiresIn
  });
  response.cookies.set({
    name: PORTAL_REFRESH_COOKIE,
    value: result.refreshToken,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  return response;
}
