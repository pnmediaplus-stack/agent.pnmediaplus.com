import { NextResponse } from "next/server";
import { verifyUiAuth } from "@/lib/ui-auth-guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await verifyUiAuth(req);
  if (!guard.ok) return guard.response;
  
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'MISSING_CONFIGURATION', message: 'Supabase credentials missing' }, { status: 500 });
  }

  const url = new URL(req.url);
  const tenantId = url.searchParams.get("tenant_id");
  
  let query = `${supabaseUrl}/rest/v1/phase5_strategies?status=eq.active&limit=1`;
  if (tenantId) {
    query += `&tenant_id=eq.${tenantId}`;
  }

  const headers = {
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Type': 'application/json'
  };

  try {
    const stratRes = await fetch(query, { headers });
    const strategies = await stratRes.json();
    
    return NextResponse.json(strategies);
  } catch (error: any) {
    return NextResponse.json({ error: 'FETCH_FAILED', message: error.message }, { status: 500 });
  }
}
