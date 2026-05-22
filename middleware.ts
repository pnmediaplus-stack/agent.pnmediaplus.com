import { NextRequest, NextResponse } from "next/server";
import {
  CONTROL_PLANE_SESSION_COOKIE,
  createControlPlaneSessionCookieValue,
  verifyControlPlaneSessionCookieValue
} from "@/lib/control-plane-session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/") || pathname.startsWith("/_next/") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const currentSession = request.cookies.get(CONTROL_PLANE_SESSION_COOKIE)?.value;
  const isValid = currentSession ? await verifyControlPlaneSessionCookieValue(currentSession) : null;

  if (isValid) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  const sessionValue = await createControlPlaneSessionCookieValue("human:task-inbox-ui");
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

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
