import { NextResponse } from "next/server";
import { generateR2PresignedUploadUrl } from "@/lib/r2-client";
import { verifyUiAuth } from "@/lib/ui-auth-guard";

export async function POST(req: Request) {
  try {
    // SECURITY PATCH: Verify UI Auth before issuing Presigned URL
    const auth = await verifyUiAuth(req);
    if (!auth.ok) return auth.response;

    const { name, type, size } = await req.json();

    if (!name || !type) {
      return NextResponse.json({ success: false, message: "Missing file info" }, { status: 400 });
    }

    // Tự động kiểm tra dung lượng (Max 50MB)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (size && size > MAX_SIZE) {
      return NextResponse.json({ success: false, message: "File exceeds 50MB limit" }, { status: 413 });
    }

    // Tách phần mở rộng của file
    const nameParts = name.split(".");
    const extension = nameParts.length > 1 ? nameParts.pop() : "bin";
    const objectKey = `chat-attachments/${crypto.randomUUID()}.${extension}`;

    // Cấp Presigned URL (chỉ sống trong 300 giây = 5 phút)
    const presignedUrl = await generateR2PresignedUploadUrl(objectKey, 300, type);
    
    const publicUrl = `/api/assets/public/${objectKey}`;

    return NextResponse.json({
      success: true,
      presignedUrl,
      objectKey,
      publicUrl
    });
  } catch (error: any) {
    console.error("Presign error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}