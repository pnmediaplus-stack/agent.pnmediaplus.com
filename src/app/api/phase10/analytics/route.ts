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

    const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!supabaseUrl || !supabaseKey) {
       return NextResponse.json({ ok: false, error: "Database configuration missing" }, { status: 500 });
    }

    // 1. Fetch live ledger data for this tenant
    // We use the existing Phase 2 usage ledger for Phase 10 governance
    const endpoint = new URL(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/phase2_llm_usage`);
    endpoint.searchParams.set("tenant_id", `eq.${tenantId}`);
    endpoint.searchParams.set("status", "eq.COMPLETED");
    endpoint.searchParams.set("select", "created_at,provider,model,estimated_cost");
    endpoint.searchParams.set("order", "created_at.desc");

    const response = await fetch(endpoint, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: "application/json"
      },
      cache: "no-store"
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ ok: false, error: `Failed to fetch ledger: ${err}` }, { status: 500 });
    }

    const usageRecords = (await response.json()) as Array<{
      created_at: string;
      provider: string;
      model: string;
      estimated_cost: number;
    }>;

    // 2. Compute live aggregates
    // Current Spend
    let currentSpend = 0;
    const distributionMap: Record<string, { value: number; fill: string }> = {};
    const chartMap: Record<string, { openai: number; fal_ai: number }> = {};

    const fallbackColors: Record<string, string> = {
      "gpt-4o": "#06b6d4",
      "gpt-4-turbo": "#3b82f6",
      "flux-pro": "#f43f5e",
      "flux-schnell": "#f97316"
    };

    usageRecords.forEach((record) => {
      const cost = Number(record.estimated_cost) || 0;
      currentSpend += cost;

      // Model Distribution
      if (!distributionMap[record.model]) {
        distributionMap[record.model] = {
           value: 0,
           fill: fallbackColors[record.model] || "#8b5cf6" // Default purple
        };
      }
      distributionMap[record.model].value += cost;

      // Daily Chart
      // Assuming created_at is ISO format: 2026-08-03T10:00:00Z -> Extract just the YYYY-MM-DD
      const dateStr = record.created_at.substring(0, 10);
      if (!chartMap[dateStr]) {
        chartMap[dateStr] = { openai: 0, fal_ai: 0 };
      }
      if (record.provider === "openai") {
        chartMap[dateStr].openai += cost;
      } else if (record.provider === "fal-ai" || record.provider === "fal_ai") {
        chartMap[dateStr].fal_ai += cost;
      }
    });

    // Convert Maps to Arrays for Recharts
    const distribution = Object.entries(distributionMap)
      .map(([name, data]) => ({ name, value: data.value, fill: data.fill }))
      .sort((a, b) => b.value - a.value);

    // Get last 5 days from the chart map
    const sortedDates = Object.keys(chartMap).sort(); // Ascending dates
    const recentDates = sortedDates.slice(-5);
    const chartData = recentDates.map(date => ({
      date,
      openai: chartMap[date].openai,
      fal_ai: chartMap[date].fal_ai
    }));

    // In a real environment, we'd query tenant_billing_profiles for the quota.
    // For now, we use the environment variable limit, matching the reserve RPC logic.
    const quotaEnvVar = `LLM_DAILY_BUDGET_OPENAI`;
    const monthlyQuota = parseFloat(process.env[quotaEnvVar] || "50.0");
    
    // Status reflects the actual fail-closed limit from Phase 2 RPC
    const status = currentSpend >= monthlyQuota ? "EXCEEDED" : "ACTIVE";

    return NextResponse.json({
      ok: true,
      data: {
        tenant_id: tenantId,
        billing: {
          monthly_quota_usd: monthlyQuota,
          current_spend_usd: currentSpend,
          status
        },
        chartData,
        distribution
      }
    });

  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
