import { NextResponse } from "next/server";
import { loadPortalOrganizationContext } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const authContext = await loadPortalOrganizationContext(request.headers);
    if (authContext.state !== "ready") {
      return NextResponse.json({ ok: false, error: authContext.reason }, { status: 401 });
    }

    const tenantId = authContext.active_membership.organization_id;

    // TODO: In a real environment, query `public.ai_token_ledger` or `public.phase2_llm_usage`
    // using the Supabase Service Role client here.
    // For now, we return mock analytics data that matches the Phase 10 specs.
    
    // Mock Data
    const mockMonthlyQuota = 50.0;
    const mockCurrentSpend = 12.45;

    const mockChartData = [
      { date: "2026-08-01", openai: 1.2, fal_ai: 0.5 },
      { date: "2026-08-02", openai: 2.1, fal_ai: 1.1 },
      { date: "2026-08-03", openai: 0.8, fal_ai: 0.2 },
      { date: "2026-08-04", openai: 3.5, fal_ai: 0.0 },
      { date: "2026-08-05", openai: 1.9, fal_ai: 1.15 }
    ];

    const mockDistribution = [
      { name: "GPT-4o", value: 9.5, fill: "#06b6d4" }, // cyan-500
      { name: "Flux Pro", value: 2.95, fill: "#f43f5e" } // rose-500
    ];

    return NextResponse.json({
      ok: true,
      data: {
        tenant_id: tenantId,
        billing: {
          monthly_quota_usd: mockMonthlyQuota,
          current_spend_usd: mockCurrentSpend,
          status: "ACTIVE"
        },
        chartData: mockChartData,
        distribution: mockDistribution
      }
    });

  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
