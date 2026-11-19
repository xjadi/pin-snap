import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import type { JoinMePost, JoinMeReply } from "@/lib/joinMe";

type RawJoinMeRow = {
  id: string;
  user_id: string;
  title: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  start_date: string;
  end_date: string | null;
  schedule_note: string;
  details: string;
  status: "open" | "closed";
  created_at: string;
  profiles: { display_name: string; avatar_url: string } | null;
  join_me_replies?: Array<{ id: string; user_id: string; intent: "join" | "reply" }> | null;
};

type RawReplyRow = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  intent: "join" | "reply";
  created_at: string;
  profiles: { display_name: string; avatar_url: string } | null;
};

const POST_SELECT =
  "id, user_id, title, city, country, lat, lng, start_date, end_date, schedule_note, details, status, created_at, profiles!join_me_posts_user_id_fkey ( display_name, avatar_url ), join_me_replies ( id, user_id, intent )";

const POST_SELECT_FALLBACK =
  "id, user_id, title, city, country, lat, lng, start_date, end_date, schedule_note, details, status, created_at, profiles!inner ( display_name, avatar_url ), join_me_replies ( id, user_id, intent )";

export function mapJoinMePost(row: RawJoinMeRow, fallbackName: string): JoinMePost {
  const replies = row.join_me_replies ?? [];
  const joiners = new Set(
    replies.filter((r) => r.intent === "join" && r.user_id !== row.user_id).map((r) => r.user_id),
  );
  return {
    id: row.id,
    owner_id: row.user_id,
    owner_display_name: row.profiles?.display_name ?? fallbackName,
    owner_avatar_url: row.profiles?.avatar_url ?? "",
    title: row.title,
    city: row.city ?? "",
    country: row.country ?? "",
    lat: row.lat,
    lng: row.lng,
    start_date: row.start_date,
    end_date: row.end_date,
    schedule_note: row.schedule_note ?? "",
    details: row.details ?? "",
    status: row.status === "closed" ? "closed" : "open",
    created_at: row.created_at,
    reply_count: replies.length,
    joiner_count: joiners.size,
  };
}

export function mapJoinMeReply(row: RawReplyRow, fallbackName: string): JoinMeReply {
  return {
    id: row.id,
    post_id: row.post_id,
    author_id: row.user_id,
    author_display_name: row.profiles?.display_name ?? fallbackName,
    author_avatar_url: row.profiles?.avatar_url ?? "",
    body: row.body,
    intent: row.intent === "join" ? "join" : "reply",
    created_at: row.created_at,
  };
}

/**
 * Fetch all Join Me posts along with owner profile and reply/joiner counts.
 * Returns `{ posts, schemaMissing }` so callers can degrade gracefully before
 * the SQL migration has been run.
 */
export async function fetchJoinMePosts(
  supabase: SupabaseClient<Database>,
  fallbackName: string,
): Promise<{ posts: JoinMePost[]; schemaMissing: boolean }> {
  let res = await supabase
    .from("join_me_posts")
    .select(POST_SELECT_FALLBACK)
    .order("created_at", { ascending: false });

  if (res.error) {
    // Try explicit FK hint if PostgREST raised an ambiguity error.
    if (res.error.code === "PGRST201") {
      res = await supabase
        .from("join_me_posts")
        .select(POST_SELECT)
        .order("created_at", { ascending: false });
    }
  }

  if (res.error) {
    // 42P01 (undefined_table) or PGRST205 (schema cache missing table)
    const code = res.error.code ?? "";
    const msg = res.error.message ?? "";
    const missing =
      code === "42P01" ||
      code === "PGRST205" ||
      msg.includes("join_me_posts") ||
      msg.includes("does not exist");
    return { posts: [], schemaMissing: missing };
  }

  const rows = (res.data ?? []) as unknown as RawJoinMeRow[];
  return {
    posts: rows.map((r) => mapJoinMePost(r, fallbackName)),
    schemaMissing: false,
  };
}

export async function fetchJoinMePostById(
  supabase: SupabaseClient<Database>,
  id: string,
  fallbackName: string,
): Promise<{ post: JoinMePost | null; replies: JoinMeReply[]; schemaMissing: boolean }> {
  const [postRes, repliesRes] = await Promise.all([
    supabase
      .from("join_me_posts")
      .select(POST_SELECT_FALLBACK)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("join_me_replies")
      .select(
        "id, post_id, user_id, body, intent, created_at, profiles!inner ( display_name, avatar_url )",
      )
      .eq("post_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (postRes.error) {
    const code = postRes.error.code ?? "";
    const missing = code === "42P01" || code === "PGRST205";
    return { post: null, replies: [], schemaMissing: missing };
  }

  if (!postRes.data) {
    return { post: null, replies: [], schemaMissing: false };
  }

  const post = mapJoinMePost(postRes.data as unknown as RawJoinMeRow, fallbackName);
  const replies = ((repliesRes.data ?? []) as unknown as RawReplyRow[]).map((r) =>
    mapJoinMeReply(r, fallbackName),
  );
  return { post, replies, schemaMissing: false };
}
