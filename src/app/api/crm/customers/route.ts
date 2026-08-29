import { NextResponse } from "next/server";
import { requireCrmRouteContext, fetchSupabaseRest } from "@/lib/crm-api";

export async function PUT(req: Request) {
  const auth = await requireCrmRouteContext(req);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const res = await fetchSupabaseRest("crm_customers", {
      method: "PATCH",
      searchParams: {
        id: `eq.${id}`,
        organization_id: `eq.${auth.context.organizationId}`
      },
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates)
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
