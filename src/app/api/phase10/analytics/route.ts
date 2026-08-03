import { NextResponse } from "next/server";
import { readPortalAccessToken, loadPortalOrganizationContext, verifySupabaseAccessToken } from "@/lib/portal-auth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const token = readPortalAccessToken(request.headers);
    const auth = await verifySupabaseAccessToken(token);
    
    if (!auth) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const authContext = await loadPortalOrganizationContext(token || '', auth.id);
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
    // We now govern via the official Phase 10 ledger (ai_token_ledger)
    const endpoint = new URL(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/ai_token_ledger`);
    endpoint.searchParams.set("organization_id", `eq.${tenantId}`);
    endpoint.searchParams.set("select", "created_at,provider_code,model_used,estimated_cost_usd");
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
      provider_code: string;
      model_used: string;
      estimated_cost_usd: number;
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
      const cost = Number(record.estimated_cost_usd) || 0;
      currentSpend += cost;

      // Model Distribution
      if (!distributionMap[record.model_used]) {
        distributionMap[record.model_used] = {
           value: 0,
           fill: fallbackColors[record.model_used] || "#8b5cf6" // Default purple
        };
      }
      distributionMap[record.model_used].value += cost;

      // Daily Chart
      // Assuming created_at is ISO format: 2026-08-03T10:00:00Z -> Extract just the YYYY-MM-DD
      const dateStr = record.created_at.substring(0, 10);
      if (!chartMap[dateStr]) {
        chartMap[dateStr] = { openai: 0, fal_ai: 0 };
      }
      if (record.provider_code === "openai") {
        chartMap[dateStr].openai += cost;
      } else if (record.provider_code === "fal-ai" || record.provider_code === "fal_ai") {
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

    // 3. Fetch tenant billing profile for true quota governance
    const billingEndpoint = new URL(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/tenant_billing_profiles`);
    billingEndpoint.searchParams.set("organization_id", `eq.${tenantId}`);
    billingEndpoint.searchParams.set("select", "monthly_quota_usd,current_spend_usd,status");
    
    const billingResponse = await fetch(billingEndpoint, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: "application/json"
      },
      cache: "no-store"
    });

    let monthlyQuota = 50.0;
    let billingStatus = currentSpend >= monthlyQuota ? "EXCEEDED" : "ACTIVE";
    let storedSpend = currentSpend;

    if (billingResponse.ok) {
      const billingRecords = await billingResponse.json();
      if (billingRecords && billingRecords.length > 0) {
        monthlyQuota = parseFloat(billingRecords[0].monthly_quota_usd) || 50.0;
        storedSpend = parseFloat(billingRecords[0].current_spend_usd) || currentSpend;
        billingStatus = billingRecords[0].status || (storedSpend >= monthlyQuota ? "EXCEEDED" : "ACTIVE");
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        tenant_id: tenantId,
        billing: {
          monthly_quota_usd: monthlyQuota,
          current_spend_usd: storedSpend,
          status: billingStatus
        },
        chartData,
        distribution
      }
    });

  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
