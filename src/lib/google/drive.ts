// Server-only Google Drive helper for pin photo storage.
// Uses a service account (env vars) to upload/fetch/delete files in a
// shared Drive folder. Never import this from a client component.

import { GoogleAuth } from "google-auth-library";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";
const UPLOAD_URL =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id";
const FILES_URL = "https://www.googleapis.com/drive/v3/files";

function getCredentials() {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  // Env files store the key with literal \n escapes; restore real newlines.
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!clientEmail || !privateKey || !folderId) {
    throw new Error("Missing Google Drive env config");
  }
  return { clientEmail, privateKey, folderId };
}

let authClient: GoogleAuth | null = null;

function getAuth(): GoogleAuth {
  if (!authClient) {
    const { clientEmail, privateKey } = getCredentials();
    authClient = new GoogleAuth({
      credentials: { client_email: clientEmail, private_key: privateKey },
      scopes: [DRIVE_SCOPE],
    });
  }
  return authClient;
}

async function getAccessToken(): Promise<string> {
  const client = await getAuth().getClient();
  const res = await client.getAccessToken();
  if (!res.token) throw new Error("Could not get Google access token");
  return res.token;
}

export const DRIVE_FILE_ID_RE = /^[A-Za-z0-9_-]{10,}$/;

/** Upload image bytes into the shared folder; returns the new Drive file ID. */
export async function driveUpload(
  bytes: ArrayBuffer,
  contentType: string,
): Promise<string> {
  const { folderId } = getCredentials();
  const token = await getAccessToken();

  const boundary = `pinsnap-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const metadata = JSON.stringify({
    name: `pin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    parents: [folderId],
  });

  const head = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
      `${metadata}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${contentType}\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([
    head,
    Buffer.from(new Uint8Array(bytes)),
    tail,
  ]);

  const res = await fetch(UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: new Uint8Array(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Drive upload failed (${res.status}): ${detail.slice(0, 200)}`);
  }
  const data = (await res.json()) as { id?: string };
  if (!data.id) throw new Error("Drive upload returned no file id");

  // Make the file readable by anyone with the link so the proxy can serve it.
  const permRes = await fetch(`${FILES_URL}/${data.id}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });
  if (!permRes.ok) {
    // Non-fatal: file exists but may not be publicly readable.
    console.error("Drive permission set failed:", await permRes.text());
  }

  return data.id;
}

/** Fetch the raw bytes of a Drive file (alt=media). */
export async function driveFetchFile(
  fileId: string,
): Promise<{ bytes: ArrayBuffer; contentType: string } | null> {
  const token = await getAccessToken();
  const res = await fetch(`${FILES_URL}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return {
    bytes: await res.arrayBuffer(),
    contentType: res.headers.get("content-type") ?? "application/octet-stream",
  };
}

/** Delete a Drive file. Best-effort; returns success boolean. */
export async function driveDelete(fileId: string): Promise<boolean> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${FILES_URL}/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    // 204 = deleted; 404 = already gone (fine for cleanup).
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}