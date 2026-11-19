import type { PinFilter } from "@/lib/pin";

export type JoinMeStatus = "open" | "closed";
export type JoinMeReplyIntent = "join" | "reply";

export interface JoinMePost {
  id: string;
  owner_id: string;
  owner_display_name: string;
  owner_avatar_url: string;
  title: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  start_date: string; // YYYY-MM-DD
  end_date: string | null; // YYYY-MM-DD
  schedule_note: string;
  details: string;
  status: JoinMeStatus;
  created_at: string;
  reply_count: number;
  joiner_count: number;
}

export interface JoinMeReply {
  id: string;
  post_id: string;
  author_id: string;
  author_display_name: string;
  author_avatar_url: string;
  body: string;
  intent: JoinMeReplyIntent;
  created_at: string;
}

const KEY = (s: string) => (s ?? "").trim();

export function filterJoinMePosts(
  posts: JoinMePost[],
  f: PinFilter | null,
): JoinMePost[] {
  if (!f) return posts;
  if (f.type === "country") {
    return posts.filter((p) => KEY(p.country) === f.value);
  }
  return posts.filter((p) => KEY(p.city) === f.value);
}

/** Compute bounding box [min, max] (lng/lat) for any array of lat/lng points. */
export function pointsBounds(
  points: Array<{ lat: number; lng: number }>,
): [[number, number], [number, number]] | null {
  if (points.length === 0) return null;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;
  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  for (const p of points) {
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
  }
  if (minLng === maxLng) {
    minLng -= 0.05;
    maxLng += 0.05;
  }
  if (minLat === maxLat) {
    minLat -= 0.05;
    maxLat += 0.05;
  }
  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

/**
 * Format a YYYY-MM-DD calendar date without timezone drift by reading the
 * literal calendar components and formatting in UTC.
 */
function formatCalendarDate(ymd: string, locale: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return ymd;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  const d = new Date(Date.UTC(year, month, day));
  if (Number.isNaN(d.getTime())) return ymd;
  try {
    return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    }).format(d);
  } catch {
    return ymd;
  }
}

export function formatScheduleRange(
  startDate: string,
  endDate: string | null,
  locale: string = "en",
): string {
  const start = formatCalendarDate(startDate, locale);
  if (!endDate || endDate === startDate) return start;
  const end = formatCalendarDate(endDate, locale);
  return `${start} – ${end}`;
}

export function formatRelativeTimestamp(iso: string, locale: string = "en"): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  try {
    return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return iso.slice(0, 16).replace("T", " ");
  }
}

/** Return today's local calendar date as YYYY-MM-DD. */
export function todayLocalYmd(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** True if the schedule hasn't ended yet (end_date or start_date >= today). */
export function isUpcomingPost(post: Pick<JoinMePost, "start_date" | "end_date">): boolean {
  const compareDate = post.end_date || post.start_date;
  return compareDate >= todayLocalYmd();
}
