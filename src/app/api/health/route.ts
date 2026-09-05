import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const timestamp = new Date().toISOString();
  const uptime = process.uptime();

  return NextResponse.json({
    status: "ok",
    ready: true,
    service: "agent.pnmediaplus.com",
    timestamp,
    uptime_seconds: Math.floor(uptime),
    environment: process.env.NODE_ENV || "production"
  }, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, max-age=0"
    }
  });
}
