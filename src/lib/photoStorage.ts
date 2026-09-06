// Server-only pin photo storage helpers (Supabase Storage, `pins` bucket).
// Files are organised per user: pins/<userId>/<uuid>.<ext> — so any user's
// files can be cleaned up in bulk and ownership is encoded in the path.
// Authorization is enforced by the API routes: they authenticate the user
// and always derive the path from the authenticated user's id.

import { supabaseService } from "./supabase/service.ts";

const BUCKET = "pins";

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export function storagePathFor(userId: string, contentType: string): string {
  const ext = EXT_BY_TYPE[contentType] ?? "jpg";
  return `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
}

/** Upload image bytes into the user's folder; returns the permanent public URL. */
export async function uploadPinPhotoServer(
  bytes: ArrayBuffer,
  contentType: string,
  userId: string,
): Promise<string> {
  const path = storagePathFor(userId, contentType);
  const { error } = await supabaseService.storage
    .from(BUCKET)
    .upload(path, new Uint8Array(bytes), {
      contentType,
      cacheControl: "31536000",
      upsert: false,
    });
  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }
  const { data } = supabaseService.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Delete a stored photo by its bucket path. Best-effort. */
export async function deletePinPhotoServer(path: string): Promise<boolean> {
  const { error } = await supabaseService.storage.from(BUCKET).remove([path]);
  return !error;
}

/** Extract `pins/<userId>/<file>` from a stored public URL (if any). */
export function storagePathFromUrl(url: string): string | null {
  const m = url.match(/\/storage\/v1\/object\/public\/pins\/([^\s?]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}