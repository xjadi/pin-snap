import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { driveUpload } from "@/lib/google/drive";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

function siteOrigin(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
}

export async function POST(req: NextRequest) {
  // Require a live Supabase session.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Read + validate the file.
  let file: File;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (!(f instanceof File)) throw new Error("no file");
    file = f;
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  // Upload to Drive via the service account.
  try {
    const bytes = await file.arrayBuffer();
    const fileId = await driveUpload(bytes, file.type);
    return NextResponse.json({
      url: `${siteOrigin(req)}/api/photo/${fileId}`,
    });
  } catch (err) {
    console.error("Upload failed:", err);
    const configured = Boolean(
      process.env.GOOGLE_CLIENT_EMAIL &&
        process.env.GOOGLE_PRIVATE_KEY &&
        process.env.GOOGLE_DRIVE_FOLDER_ID,
    );
    return NextResponse.json(
      { error: configured ? "upload_failed" : "not_configured" },
      { status: configured ? 502 : 500 },
    );
  }
}