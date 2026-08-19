import { NextRequest, NextResponse } from "next/server";
import { generateR2PresignedDownloadUrl } from "@/lib/r2-client";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ALLOWED_PREFIXES = ['campaign-media', 'chat-attachments'];

export async function GET(req: NextRequest, { params }: { params: Promise<{ key: string[] }> | { key: string[] } }) {
  try {
    const resolvedParams = await params;
    const keyArray = resolvedParams.key;
    if (!keyArray || keyArray.length === 0) {
      return NextResponse.json({ error: "Missing object key" }, { status: 400 });
    }

    const key = keyArray.join('/');

    // Security: Only allow specific safe prefixes to be served publicly
    const isAllowed = ALLOWED_PREFIXES.some(prefix => key.startsWith(`${prefix}/`));
    
    if (!isAllowed) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Basic key validation to prevent absolute URLs or path traversal
    if (key.includes('..') || key.startsWith('http')) {
       return NextResponse.json({ error: "Invalid object key" }, { status: 400 });
    }

    const publicDomain = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
    if (publicDomain) {
      // If a public domain is configured, redirect directly to it
      const cleanDomain = publicDomain.replace(/\/$/, '');
      return NextResponse.redirect(`${cleanDomain}/${key}`, { status: 302 });
    }

    // Fallback: Generate a presigned URL valid for 1 hour
    const presignedUrl = await generateR2PresignedDownloadUrl(key, 3600); 

    // 302 Redirect with strict no-store to ensure the browser/crawler fetches a fresh presigned URL
    return NextResponse.redirect(presignedUrl, {
      status: 302,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (err: any) {
    console.error("Public Asset Proxy Error:", err);
    return NextResponse.json({ error: "Failed to resolve public asset" }, { status: 500 });
  }
}
