import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  storagePathFromUrl,
  uploadPinPhotoServer,
} from "@/lib/photoStorage";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const FETCH_TIMEOUT_MS = 10_000;

function siteOrigin(req: NextRequest): string {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
}

/** Light SSRF guard: only public http(s) endpoints, no private/localhost hosts. */
function isSafeRemoteUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return false;
  const h = u.hostname.toLowerCase();
  if (
    h === "localhost" ||
    h === "0.0.0.0" ||
    h === "[::1]" ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^169\.254\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h)
  ) {
    return false;
  }
  return true;
}

export async function POST(req: NextRequest) {
  // Require a live Supabase session — the uploader's id scopes the storage
  // folder the file lands in.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const contentTypeHeader = req.headers.get("content-type") ?? "";

  let bytes: ArrayBuffer;
  let fileType: string;

  if (contentTypeHeader.includes("application/json")) {
    // ── Auto-import mode: { url: "https://…" } ──
    let body: { url?: string };
    try {
      body = (await req.json()) as { url?: string };
    } catch {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    const url = (body.url ?? "").trim();
    if (!url || !isSafeRemoteUrl(url)) {
      return NextResponse.json({ error: "link_invalid" }, { status: 400 });
    }

    // Already stored in our bucket? Return the same URL (no re-import).
    if (storagePathFromUrl(url)) {
      return NextResponse.json({ url });
    }
    // Legacy Drive-proxy URL? Return as-is.
    const self = url.match(/\/api\/photo\/([A-Za-z0-9_-]{10,})/);
    if (self) {
      return NextResponse.json({ url: `${siteOrigin(req)}/api/photo/${self[1]}` });
    }

    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          // Some CDNs reject requests without a UA.
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 PinSnap/1.0",
          Accept: "image/*",
        },
      });
      if (!res.ok) {
        return NextResponse.json({ error: "link_fetch_failed" }, { status: 422 });
      }
      const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
      if (!ALLOWED_TYPES.has(type)) {
        return NextResponse.json({ error: "invalid_type" }, { status: 415 });
      }
      const buf = await res.arrayBuffer();
      if (buf.byteLength > MAX_BYTES) {
        return NextResponse.json({ error: "too_large" }, { status: 413 });
      }
      bytes = buf;
      fileType = type;
    } catch (e) {
      const timedOut = e instanceof Error && e.name === "TimeoutError";
      return NextResponse.json(
        { error: timedOut ? "link_timeout" : "link_fetch_failed" },
        { status: 422 },
      );
    }
  } else {
    // ── File-upload mode: multipart/form-data with a `file` field ──
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

    bytes = await file.arrayBuffer();
    fileType = file.type;
  }

  // Upload into the uploader's per-user folder in the `pins` bucket.
  try {
    const url = await uploadPinPhotoServer(bytes, fileType, user.id);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Upload failed:", err);
    return NextResponse.json({ error: "upload_failed" }, { status: 502 });
  }
}