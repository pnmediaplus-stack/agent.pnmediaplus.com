import { verifyUiAuth } from "@/lib/ui-auth-guard";
import { loadDepartmentGovernanceBundle } from "@/lib/department-governance-loader";
import { createServiceRoleClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const orgId = url.searchParams.get("organization_id");
  const deptId = url.searchParams.get("department_id");

  const campaignPlannerKey = process.env.N8N_CAMPAIGN_PLANNER_API_KEY?.trim();
  const authHeader =
    req.headers.get("x-n8n-api-key")?.trim() ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();

  const isN8nService = Boolean(campaignPlannerKey && authHeader && authHeader === campaignPlannerKey);

  if (isN8nService) {
    if (!orgId || !deptId) {
      return Response.json({ ok: false, state: "blocked", error: "MISSING_REQUIRED_PARAMS" }, { status: 400 });
    }
    const supabase = createServiceRoleClient();
    const { data: org, error: orgErr } = await supabase
      .schema('portal_auth')
      .from('organizations')
      .select('id')
      .eq('id', orgId)
      .eq('status', 'active')
      .single();
    
    if (orgErr || !org) {
      return Response.json({ ok: false, state: "blocked", error: "UNAUTHORIZED_TENANT_OR_INACTIVE" }, { status: 403 });
    }
  } else {
    const guard = await verifyUiAuth(req);
    if (!guard.ok) return guard.response;
  }

  if (req.method !== "GET") {
    return Response.json(
      { ok: false, state: "blocked", error: "METHOD_NOT_ALLOWED" },
      { status: 405, headers: { "Allow": "GET", "Cache-Control": "no-store" } }
    );
  }

  try {
    const bundle = await loadDepartmentGovernanceBundle();
    if (bundle.state !== "ready") {
      return Response.json(
        { ok: false, state: "blocked", reason: bundle.reason },
        { status: 503, headers: { "Cache-Control": "no-store" } }
      );
    }

    let departments = bundle.data.registryJson.department_records || [];
    
    // N8N Service lane always filters by deptId as enforced above
    if (isN8nService || deptId) {
      departments = departments.filter(d => d.department_id === deptId);
    }

    const packsResult: any = {};
    if (departments.length === 1 && deptId) {
      const dept = departments[0];
      const packKey = (dept as any).department_pack_key;
      if (packKey) {
        const packData = bundle.data.packsJson.department_packs[packKey];
        if (packData) {
          packsResult[packKey] = {
            qa_expectation: packData.qa_expectation,
            allowed_actions: packData.allowed_actions,
            must_not_actions: packData.must_not_actions
          };
        }
      }
    } else if (isN8nService) {
      return Response.json({ ok: false, state: "blocked", error: "DEPARTMENT_NOT_FOUND" }, { status: 404 });
    } else {
      // For UI fallback without deptId, return all departments but NO packs
      return Response.json(
        {
          ok: true,
          state: "ready",
          departments: bundle.data.registryJson.department_records || [],
          packs: {}
        },
        { status: 200, headers: { "Cache-Control": "no-store" } }
      );
    }

    return Response.json(
      {
        ok: true,
        state: "ready",
        departments: departments,
        packs: packsResult
      },
      { status: 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Unexpected error in /api/governance/bundle:", err);
    return Response.json(
      { ok: false, state: "blocked" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
