import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deletePinPhotoServer } from "@/lib/photoStorage";

/**
 * DELETE /api/storage — remove a stored pin photo.
 * Body: { path: "<userId>/<file.ext>" }.
 * Authorization: the caller must be authenticated AND the path must live
 * inside their own per-user folder — enforced here before the service
 * client performs the removal.
 */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let path: string;
  try {
    const body = (await req.json()) as { path?: string };
    path = (body.path ?? "").trim();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  // The path must be exactly "<caller's userId>/<filename>" — no traversal,
  // no deleting other users' files.
  if (!path.startsWith(user.id + "/") || path.includes("..")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const ok = await deletePinPhotoServer(path);
  return NextResponse.json({ ok });
}