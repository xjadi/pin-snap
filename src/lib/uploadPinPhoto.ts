"use client";

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // keep in sync with the server
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function isValidPhotoFile(file: File): boolean {
  return ALLOWED_TYPES.has(file.type) && file.size <= MAX_PHOTO_BYTES;
}

/** Quick client-side validation with a specific reason, for UI messaging. */
export function validatePhotoFile(
  file: File,
): { ok: true } | { ok: false; reason: "type" | "size" } {
  if (!ALLOWED_TYPES.has(file.type)) return { ok: false, reason: "type" };
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, reason: "size" };
  return { ok: true };
}

/** Upload a pin photo via /api/upload; returns the stable public URL. */
export async function uploadPinPhoto(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  if (!res.ok) {
    throw new Error(`upload_failed_${res.status}`);
  }
  const data = (await res.json()) as { url?: string };
  if (!data.url) throw new Error("upload_failed_no_url");
  return data.url;
}

/** Extract the Drive file id from a stored /api/photo/<id> URL (if any). */
export function driveFileIdFromUrl(url: string): string | null {
  const m = url.match(/\/api\/photo\/([A-Za-z0-9_-]{10,})/);
  return m ? m[1] : null;
}