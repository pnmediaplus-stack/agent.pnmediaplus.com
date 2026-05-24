import { loadPhase067LeadSnapshot } from "@/lib/phase067-lead-loader";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await loadPhase067LeadSnapshot();

  if (result.state === "blocked") {
    return Response.json(
      {
        ok: false,
        state: "blocked",
        reason: result.reason,
        source_of_truth: "public.phase067_leads + public.phase067_lead_snapshot()",
        data: null,
        receivedAt: new Date().toISOString()
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
      reason: result.reason,
      source_of_truth: "public.phase067_leads + public.phase067_lead_snapshot()",
      data: result.data,
      receivedAt: new Date().toISOString()
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
