import { cookies } from "next/headers";
import { verifySupabaseAccessToken, loadPortalOrganizationContext } from "@/lib/portal-auth";

const PORTAL_ACCESS_COOKIE = "pn_portal_access_token";

type ActionAuthResult = 
  | { ok: false; error: string; message: string }
  | { 
      ok: true; 
      actorId: string; 
      tenantId: string;
      email: string;
    };

/**
 * Validates authentication and organization context for Server Actions.
 * Strictly uses cookies() to prevent client spoofing.
 */
export async function verifyActionAuth(): Promise<ActionAuthResult> {
  const cookieStore = cookies();
  const accessToken = cookieStore.get(PORTAL_ACCESS_COOKIE)?.value;

  if (!accessToken) {
    return { ok: false, error: "UNAUTHORIZED", message: "Missing portal access token." };
  }

  // 1. Verify token signature and get user identity
  const user = await verifySupabaseAccessToken(accessToken);
  if (!user || !user.id || !user.email) {
    return { ok: false, error: "UNAUTHORIZED", message: "Invalid or expired portal access token." };
  }

  // 2. Load Organization Context to ensure tenant boundaries
  const orgContext = await loadPortalOrganizationContext(accessToken, user.id);
  if (orgContext.state !== "valid" || !orgContext.active_membership) {
    return { 
      ok: false, 
      error: "FORBIDDEN", 
      message: "No active organization membership found. Tenant context is missing." 
    };
  }

  return {
    ok: true,
    actorId: user.id,
    email: user.email,
    tenantId: orgContext.active_membership.organization_id
  };
}
