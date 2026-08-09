import { verifyUiAuth } from "@/lib/ui-auth-guard";
import { createServiceRoleClient } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await verifyUiAuth(req);
  if (!guard.ok) return guard.response;

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc("department_governance_departments");

    if (error) {
      console.error("RPC Error:", error);
      return Response.json(
        {
          ok: false,
          state: "blocked",
          departments: []
        },
        {
          status: 503,
          headers: {
            "Cache-Control": "no-store"
          }
        }
      );
    }

    return Response.json(
      {
        ok: true,
        state: "ready",
        departments: data || []
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  } catch (err) {
    console.error("Unexpected error in /api/governance/departments:", err);
    return Response.json(
      {
        ok: false,
        state: "blocked",
        departments: []
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store"
        }
      }
    );
  }
}
