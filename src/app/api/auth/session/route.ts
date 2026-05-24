import { loadPortalOrganizationContext, readPortalAccessToken, verifySupabaseAccessToken } from "@/lib/portal-auth";

export async function GET(request: Request) {
  const accessToken = readPortalAccessToken(request.headers);
  const user = await verifySupabaseAccessToken(accessToken);

  if (!user) {
    return Response.json(
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
    return Response.json(
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

  return Response.json(
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
}
