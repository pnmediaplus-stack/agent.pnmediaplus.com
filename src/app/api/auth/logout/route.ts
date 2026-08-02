import { NextResponse } from "next/server";
import { PORTAL_ACCESS_COOKIE, PORTAL_REFRESH_COOKIE } from "@/lib/portal-auth";
import { CONTROL_PLANE_SESSION_COOKIE } from "@/lib/control-plane-session";

export async function POST() {
  const response = NextResponse.json(
    {
      ok: true,
      state: "ready",
      route: "portal-auth-logout",
      status: 200,
      message: "Portal session cleared.",
      receivedAt: new Date().toISOString()
    },
    { status: 200 }
  );

  response.cookies.set({
    name: PORTAL_ACCESS_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  response.cookies.set({
    name: PORTAL_REFRESH_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  response.cookies.set({
    name: CONTROL_PLANE_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });

  return response;
}
