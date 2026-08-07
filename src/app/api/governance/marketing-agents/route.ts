import { NextResponse } from "next/server";
import { loadMarketingAgentRegistry } from "@/lib/marketing-agent-loader";

export async function GET() {
  const result = await loadMarketingAgentRegistry();

  if (result.state === "blocked") {
    return NextResponse.json(
      {
        state: "blocked",
        reason: result.reason,
        data: null
      },
      { status: 500 }
    );
  }

  // Gatekeeper Rule: Must return read-only data alongside status
  return NextResponse.json(
    {
      state: "ready",
      reason: result.reason,
      data: result.data
    },
    { status: 200 }
  );
}
