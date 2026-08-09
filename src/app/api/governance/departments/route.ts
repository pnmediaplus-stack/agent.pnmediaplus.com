import { loadDepartmentGovernanceDbBundle } from "@/lib/department-governance-db-loader";
import { verifyUiAuth } from "@/lib/ui-auth-guard";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const guard = await verifyUiAuth(req);
  if (!guard.ok) return guard.response;

  const loaded = await loadDepartmentGovernanceDbBundle();

  if (loaded.state === "blocked") {
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

  const packs = Array.isArray(loaded.data.snapshot.packs) ? loaded.data.snapshot.packs : [];

  const departments = packs.map((pack: any) => ({
    department_id: pack.pack_key,
    department_name: pack.pack_name ? pack.pack_name.replace(" Pack", "") : pack.pack_key
  }));

  return Response.json(
    {
      ok: true,
      state: "ready",
      departments
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
