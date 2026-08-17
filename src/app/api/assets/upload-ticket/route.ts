import { NextRequest, NextResponse } from "next/server";
import { generateR2PresignedUploadUrl } from "@/lib/r2-client";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
     const body = await req.json();
     const { fileExtension, prefix = "campaign-media" } = body;
     
     if (!fileExtension) {
        return NextResponse.json({ error: "Missing fileExtension" }, { status: 400 });
     }

     const dateStr = new Date().toISOString().split('T')[0];
     const uuid = crypto.randomUUID();
     // Safe sanitize extension
     const safeExt = fileExtension.replace(/[^a-zA-Z0-9]/g, '');
     const objectKey = `${prefix}/${dateStr}/${uuid}.${safeExt}`;

     const presignedUrl = await generateR2PresignedUploadUrl(objectKey, 900); // 15 mins

     return NextResponse.json({
       objectKey,
       uploadUrl: presignedUrl,
       expiresIn: 900
     });

  } catch (err: any) {
    console.error("Upload Ticket Error:", err);
    return NextResponse.json({ error: "Failed to generate upload ticket" }, { status: 500 });
  }
}
