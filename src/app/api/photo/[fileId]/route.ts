import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DRIVE_FILE_ID_RE, driveDelete, driveFetchFile } from "@/lib/google/drive";

type Ctx = { params: Promise<{ fileId: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { fileId } = await ctx.params;
  if (!DRIVE_FILE_ID_RE.test(fileId)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const file = await driveFetchFile(fileId);
  if (!file) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Files are write-once (a new photo = a new file), so aggressive immutable
  // caching is safe and keeps repeat views off our server.
  return new NextResponse(file.bytes, {
    status: 200,
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.bytes.byteLength),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { fileId } = await ctx.params;
  if (!DRIVE_FILE_ID_RE.test(fileId)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Require a live Supabase session. Ownership of the pin row was already
  // enforced by RLS before the client calls this cleanup endpoint.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ok = await driveDelete(fileId);
  // 404 (already deleted) is success for cleanup purposes.
  return NextResponse.json({ ok });
}