"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import {
  formatRelativeTimestamp,
  type JoinMePost,
  type JoinMeReply,
  type JoinMeReplyIntent,
} from "@/lib/joinMe";

export function JoinMeThreadPanel({
  post,
  replies,
  locale = "en",
  onRepliesChange,
  compact = false,
}: {
  post: JoinMePost;
  replies: JoinMeReply[];
  locale?: string;
  onRepliesChange: (nextReplies: JoinMeReply[]) => void;
  compact?: boolean;
}) {
  const t = useTranslations();
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();

  const isHost = Boolean(user && user.id === post.owner_id);
  const [intent, setIntent] = useState<JoinMeReplyIntent>(isHost ? "reply" : "join");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canReply = Boolean(user && (post.status === "open" || isHost));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || !user) return;

    setSubmitting(true);
    setError(null);

    const chosenIntent: JoinMeReplyIntent = isHost ? "reply" : intent;

    const { data, error: insertError } = await supabase
      .from("join_me_replies")
      .insert({
        post_id: post.id,
        user_id: user.id,
        body: trimmed,
        intent: chosenIntent,
      })
      .select("id, post_id, user_id, body, intent, created_at")
      .single();

    if (insertError || !data) {
      setSubmitting(false);
      setError(t("JoinMe.errReplyFailed"));
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    const newReply: JoinMeReply = {
      id: data.id,
      post_id: data.post_id,
      author_id: data.user_id,
      author_display_name: profile?.display_name ?? t("Fallback.pinner"),
      author_avatar_url: profile?.avatar_url ?? "",
      body: data.body,
      intent: data.intent === "join" ? "join" : "reply",
      created_at: data.created_at,
    };

    onRepliesChange([...replies, newReply]);
    setBody("");
    setSubmitting(false);
  }

  async function handleDeleteReply(replyId: string) {
    setDeletingId(replyId);
    const { error: delError } = await supabase
      .from("join_me_replies")
      .delete()
      .eq("id", replyId);
    setDeletingId(null);
    if (!delError) {
      onRepliesChange(replies.filter((r) => r.id !== replyId));
    }
  }

  return (
    <section aria-label={t("JoinMe.threadHeading")} className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-border pb-2">
        <h3 className="font-typewriter text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">
          💬 {t("JoinMe.threadHeading")} ({replies.length})
        </h3>
        {post.joiner_count > 0 && (
          <span className="font-typewriter rounded bg-verde/15 px-2 py-0.5 text-[11px] font-bold text-verde">
            🙋 {t("JoinMe.joinerCount", { count: post.joiner_count })}
          </span>
        )}
      </div>

      {/* Replies list */}
      {replies.length === 0 ? (
        <div className="deckle-note rounded-lg p-5 text-center">
          <p className="font-typewriter text-xs text-ink-muted">
            {t("JoinMe.noRepliesYet")}
          </p>
        </div>
      ) : (
        <ol className={`space-y-3 ${compact ? "max-h-64 overflow-y-auto pr-1" : ""}`}>
          {replies.map((reply) => {
            const replyIsHost = reply.author_id === post.owner_id;
            const replyIsMine = Boolean(user && user.id === reply.author_id);
            return (
              <li
                key={reply.id}
                className={`rounded-lg border p-3.5 ${
                  reply.intent === "join" && !replyIsHost
                    ? "border-verde/45 bg-verde/5"
                    : "border-border bg-surface-2/45"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Link href={`/users/${reply.author_id}`} className="shrink-0">
                      <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-xs">
                        {reply.author_avatar_url ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={reply.author_avatar_url}
                            alt={reply.author_display_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          "🙂"
                        )}
                      </span>
                    </Link>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Link
                          href={`/users/${reply.author_id}`}
                          className="font-display truncate text-sm font-bold text-ink hover:underline"
                        >
                          {reply.author_display_name}
                        </Link>
                        {replyIsHost && (
                          <span className="font-typewriter rounded border border-magenta/50 bg-magenta/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-magenta">
                            {t("JoinMe.badgeHost")}
                          </span>
                        )}
                        {!replyIsHost && reply.intent === "join" && (
                          <span className="font-typewriter rounded border border-verde/50 bg-verde/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-verde">
                            🙋 {t("JoinMe.badgeWantToJoin")}
                          </span>
                        )}
                      </div>
                      <p className="font-typewriter text-[10px] text-ink-muted">
                        {formatRelativeTimestamp(reply.created_at, locale)}
                      </p>
                    </div>
                  </div>

                  {replyIsMine && (
                    <button
                      type="button"
                      onClick={() => handleDeleteReply(reply.id)}
                      disabled={deletingId === reply.id}
                      className="font-typewriter shrink-0 text-[10px] font-bold uppercase tracking-wider text-danger/80 hover:text-danger hover:underline disabled:opacity-50"
                    >
                      {t("JoinMe.deleteReply")}
                    </button>
                  )}
                </div>

                <p className="mt-2.5 whitespace-pre-wrap pl-10 text-sm leading-relaxed text-ink">
                  {reply.body}
                </p>
              </li>
            );
          })}
        </ol>
      )}

      {/* Reply composer */}
      {authLoading ? null : !user ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-surface-2/60 p-3.5">
          <p className="font-typewriter text-xs text-ink-muted">
            {t("JoinMe.signInToReply")}
          </p>
          <Link
            href={`/login?next=${encodeURIComponent(`/join-me/${post.id}`)}`}
            className="font-typewriter rounded-md border-2 border-ink bg-verde px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-[2px_2px_0px_var(--ink)] transition hover:opacity-95"
          >
            {t("Nav.logIn")}
          </Link>
        </div>
      ) : !canReply ? (
        <div className="rounded-lg border border-dashed border-border bg-surface-2/60 p-3.5 text-center">
          <p className="font-typewriter text-xs font-bold text-ink-muted">
            {t("JoinMe.closedNotice")}
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-xl border border-border bg-surface-2/50 p-3.5"
        >
          {!isHost && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIntent("join")}
                className={`font-typewriter rounded-md border px-3 py-1 text-xs font-bold transition ${
                  intent === "join"
                    ? "border-verde bg-verde text-white shadow-xs"
                    : "border-border bg-surface text-ink-muted hover:text-ink"
                }`}
              >
                🙋 {t("JoinMe.intentJoin")}
              </button>
              <button
                type="button"
                onClick={() => setIntent("reply")}
                className={`font-typewriter rounded-md border px-3 py-1 text-xs font-bold transition ${
                  intent === "reply"
                    ? "border-ink bg-ink text-paper shadow-xs"
                    : "border-border bg-surface text-ink-muted hover:text-ink"
                }`}
              >
                💬 {t("JoinMe.intentReply")}
              </button>
            </div>
          )}

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={compact ? 2 : 3}
            required
            placeholder={
              !isHost && intent === "join"
                ? t("JoinMe.replyPlaceholderJoin")
                : t("JoinMe.replyPlaceholderGeneral")
            }
            className="journal-lined w-full rounded-lg border border-border bg-surface px-3.5 py-2 text-sm text-ink outline-none focus:border-verde focus:ring-2 focus:ring-verde/20"
          />

          {error && (
            <p className="font-typewriter rounded bg-danger/10 px-3 py-2 text-xs text-danger">
              {error}
            </p>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !body.trim()}
              className="font-typewriter rounded-md border-2 border-ink bg-verde px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-[2px_2px_0px_var(--ink)] transition hover:translate-y-[-1px] hover:opacity-95 disabled:opacity-50"
            >
              {submitting
                ? t("JoinMe.postingReply")
                : !isHost && intent === "join"
                  ? `🙋 ${t("JoinMe.postReplyJoin")}`
                  : t("JoinMe.postReply")}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
