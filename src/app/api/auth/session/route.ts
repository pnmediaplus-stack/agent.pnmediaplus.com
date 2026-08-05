import { NextResponse } from "next/server";
import { 
  loadPortalOrganizationContext, 
  readPortalAccessToken, 
  verifySupabaseAccessToken,
  readPortalRefreshToken,
  refreshSupabaseToken,
  PORTAL_ACCESS_COOKIE,
  PORTAL_REFRESH_COOKIE
} from "@/lib/portal-auth";

export async function GET(request: Request) {
  let accessToken = readPortalAccessToken(request.headers);
  let user = await verifySupabaseAccessToken(accessToken);
  
  let newTokens: { accessToken: string; refreshToken: string; expiresIn: number } | null = null;

  if (!user) {
    const refreshToken = readPortalRefreshToken(request.headers);
    if (refreshToken) {
      const refreshResult = await refreshSupabaseToken(refreshToken);
      if (refreshResult) {
        accessToken = refreshResult.accessToken;
        user = refreshResult.user;
        newTokens = {
          accessToken: refreshResult.accessToken,
          refreshToken: refreshResult.refreshToken,
          expiresIn: refreshResult.expiresIn
        };
      }
    }
  }

  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        state: "blocked",
        route: "portal-auth-session",
        status: 401,
        message: "No valid portal session.",
        receivedAt: new Date().toISOString()
      },
      { status: 401 }
    );
  }

  const organizationContext = await loadPortalOrganizationContext(accessToken ?? "", user.id);

  if (organizationContext.state === "blocked") {
    return NextResponse.json(
      {
        ok: false,
        state: "blocked",
        route: "portal-auth-session",
        status: 403,
        message: "Portal organization membership is required.",
        user,
        organization_context: organizationContext,
        receivedAt: new Date().toISOString()
      },
      { status: 403 }
    );
  }

  const response = NextResponse.json(
    {
      ok: true,
      state: "ready",
      route: "portal-auth-session",
      status: 200,
      user,
      organization_context: organizationContext,
      receivedAt: new Date().toISOString()
    },
    { status: 200 }
  );

  if (newTokens) {
    response.cookies.set({
      name: PORTAL_ACCESS_COOKIE,
      value: newTokens.accessToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: newTokens.expiresIn
    });
    response.cookies.set({
      name: PORTAL_REFRESH_COOKIE,
      value: newTokens.refreshToken,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
  }

  return response;
}
