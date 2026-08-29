import { NextResponse } from "next/server";
import { requireCrmRouteContext, fetchSupabaseRest } from "@/lib/crm-api";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireCrmRouteContext(req);
  if (!auth.ok) return auth.response;

  try {
    const res = await fetchSupabaseRest("crm_threads", {
      method: "DELETE",
      searchParams: {
        id: `eq.${params.id}`,
        organization_id: `eq.${auth.context.organizationId}`
      }
    });

    if (!res.ok) {
      throw new Error(await res.text());
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
