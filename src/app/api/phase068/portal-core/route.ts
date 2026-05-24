import { loadPhase068ProductPortalCore } from "@/lib/phase068-product-portal-core";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const portalCore = await loadPhase068ProductPortalCore(request.headers);
  const status = portalCore.state === "ready" ? 200 : 503;

  return Response.json(
    {
      ok: portalCore.state === "ready",
      state: portalCore.state,
      reason: portalCore.reason,
      source_of_truth: "Supabase Auth + public.portal_organizations + public.portal_organization_memberships + Phase 068 roadmap",
      data: portalCore,
      receivedAt: new Date().toISOString()
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
