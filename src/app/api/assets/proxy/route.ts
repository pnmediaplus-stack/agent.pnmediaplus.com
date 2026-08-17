import { NextRequest, NextResponse } from "next/server";
import { generateR2PresignedDownloadUrl } from "@/lib/r2-client";
import { verifyActionAuth } from "@/lib/action-auth-guard";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyActionAuth();
    if (!auth.ok) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: "Missing object key" }, { status: 400 });
    }

    // Basic key validation to prevent absolute URLs or path traversal
    if (key.includes('..') || key.startsWith('http')) {
       return NextResponse.json({ error: "Invalid object key" }, { status: 400 });
    }

    const presignedUrl = await generateR2PresignedDownloadUrl(key, 3600); // 1 hour

    // 302 Redirect with strict no-store to ensure the browser always fetches a fresh presigned URL
    return NextResponse.redirect(presignedUrl, {
      status: 302,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (err: any) {
    console.error("Asset Proxy Error:", err);
    return NextResponse.json({ error: "Failed to generate presigned URL" }, { status: 500 });
  }
}
