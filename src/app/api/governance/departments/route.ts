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

  const registry = loaded.data.snapshot.registry || {};
  const department_records = Array.isArray(registry.department_records) ? registry.department_records : [];

  const departments = department_records.map((record: any) => ({
    department_id: record.department_id,
    department_name: record.department_name
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
