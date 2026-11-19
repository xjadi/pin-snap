"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import MapView from "@/components/MapView";
import { JoinMeIcon } from "@/components/JoinMeIcon";
import { JoinMeThreadPanel } from "@/components/JoinMeThreadPanel";
import { JoinMeComposer } from "@/app/join-me/JoinMeComposer";
import { countryFlag } from "@/lib/pin";
import {
  formatRelativeTimestamp,
  formatScheduleRange,
  type JoinMePost,
  type JoinMeReply,
  type JoinMeStatus,
} from "@/lib/joinMe";

export default function JoinMeThread({
  initialPost,
  initialReplies,
  locale = "en",
}: {
  initialPost: JoinMePost;
  initialReplies: JoinMeReply[];
  locale?: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();

  const [post, setPost] = useState<JoinMePost>(initialPost);
  const [replies, setReplies] = useState<JoinMeReply[]>(initialReplies);
  const [editing, setEditing] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = !authLoading && Boolean(user && user.id === post.owner_id);
  const isOpen = post.status === "open";
  const location = [post.city, post.country].filter(Boolean).join(", ");
  const schedule = formatScheduleRange(post.start_date, post.end_date, locale);

  function handleRepliesChange(next: JoinMeReply[]) {
    setReplies(next);
    const joinerCount = new Set(
      next
        .filter((r) => r.intent === "join" && r.author_id !== post.owner_id)
        .map((r) => r.author_id),
    ).size;
    setPost((prev) => ({
      ...prev,
      reply_count: next.length,
      joiner_count: joinerCount,
    }));
  }

  async function toggleStatus() {
    if (!isOwner) return;
    setStatusBusy(true);
    const nextStatus: JoinMeStatus = isOpen ? "closed" : "open";
    const { error } = await supabase
      .from("join_me_posts")
      .update({ status: nextStatus })
      .eq("id", post.id);
    setStatusBusy(false);
    if (!error) {
      setPost((prev) => ({ ...prev, status: nextStatus }));
      router.refresh();
    }
  }

  async function handleDelete() {
    if (!isOwner) return;
    setDeleting(true);
    const { error } = await supabase
      .from("join_me_posts")
      .delete()
      .eq("id", post.id);
    setDeleting(false);
    if (!error) {
      router.push("/join-me");
      router.refresh();
    }
  }

  if (editing) {
    return (
      <div className="space-y-4">
        <Link
          href="/join-me"
          className="font-typewriter inline-block text-xs font-bold uppercase tracking-wider text-ink-muted hover:text-ink hover:underline"
        >
          {t("JoinMe.backToBoard")}
        </Link>
        <JoinMeComposer
          initialPost={post}
          locale={locale}
          onSaved={(updated) => {
            setPost(updated);
            setEditing(false);
            router.refresh();
          }}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top breadcrumb bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/join-me"
          className="font-typewriter text-xs font-bold uppercase tracking-wider text-ink-muted hover:text-ink hover:underline"
        >
          {t("JoinMe.backToBoard")}
        </Link>
        <Link
          href="/?layer=join-me#community-map"
          className="font-typewriter text-xs font-bold uppercase tracking-wider text-verde hover:underline"
        >
          🗺️ {t("JoinMe.viewOnMap")}
        </Link>
      </div>

      {/* Main Topic Card */}
      <article className="relative overflow-hidden rounded-xl border-2 border-border bg-surface shadow-sm">
        <div className={`h-2 w-full ${isOpen ? "bg-verde" : "bg-ink-muted/50"}`} />

        <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[1.3fr_0.9fr]">
          {/* Left: Topic Metadata & Body */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rubber-stamp text-[10px] ${
                  isOpen ? "text-verde" : "text-ink-muted"
                }`}
              >
                <JoinMeIcon className="h-3.5 w-3.5" />
                JOIN ME · {isOpen ? t("JoinMe.statusOpen") : t("JoinMe.statusClosed")}
              </span>
              <span className="luggage-tag">
                {post.country && <span aria-hidden>{countryFlag(post.country)}</span>}
                <span>{location}</span>
              </span>
            </div>

            <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {post.title}
            </h1>

            {/* Host bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-y border-dashed border-border py-3">
              <Link
                href={`/users/${post.owner_id}`}
                className="flex items-center gap-2.5 hover:underline"
              >
                <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-2 text-sm ring-2 ring-verde/30">
                  {post.owner_avatar_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={post.owner_avatar_url}
                      alt={post.owner_display_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    "🙂"
                  )}
                </span>
                <div>
                  <p className="font-display text-sm font-bold text-ink">
                    {post.owner_display_name}
                  </p>
                  <p className="font-typewriter text-[11px] text-ink-muted">
                    {formatRelativeTimestamp(post.created_at, locale)}
                  </p>
                </div>
              </Link>

              {isOwner && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleStatus}
                    disabled={statusBusy}
                    className="font-typewriter rounded border border-border bg-surface-2 px-3 py-1 text-xs font-bold text-ink hover:border-verde hover:text-verde disabled:opacity-50"
                  >
                    {isOpen ? t("JoinMe.markClosed") : t("JoinMe.markOpen")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="font-typewriter rounded border border-border bg-surface-2 px-3 py-1 text-xs font-bold text-ink hover:border-magenta hover:text-magenta"
                  >
                    {t("JoinMe.editPost")}
                  </button>
                </div>
              )}
            </div>

            {/* Schedule block */}
            <div className="rounded-lg border border-verde/35 bg-verde/8 p-4">
              <p className="font-typewriter text-[10px] font-bold uppercase tracking-[0.18em] text-verde">
                📅 {t("JoinMe.scheduleLabel")}
              </p>
              <p className="font-display mt-1 text-lg font-bold text-ink">
                {schedule}
              </p>
              {post.schedule_note && (
                <p className="font-typewriter mt-1 text-xs text-ink-muted">
                  🕒 {post.schedule_note}
                </p>
              )}
            </div>

            {/* Post details */}
            {post.details && (
              <div className="journal-lined whitespace-pre-wrap rounded-md border border-border px-4 py-3 text-sm text-ink">
                {post.details}
              </div>
            )}

            {/* Delete confirmation row for owner */}
            {isOwner && (
              <div className="pt-2">
                {confirmDelete ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-danger/40 bg-danger/5 p-3">
                    <span className="font-typewriter text-xs font-bold text-danger">
                      {t("JoinMe.deletePostConfirm")}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(false)}
                        disabled={deleting}
                        className="font-typewriter rounded border border-border bg-surface px-3 py-1 text-xs font-bold text-ink-muted hover:bg-surface-2"
                      >
                        {t("Modal.keep")}
                      </button>
                      <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="font-typewriter rounded border border-danger bg-danger px-3 py-1 text-xs font-bold text-white hover:opacity-90 disabled:opacity-60"
                      >
                        {deleting ? t("Modal.deleting") : t("Modal.delete")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="font-typewriter text-xs font-bold uppercase tracking-wider text-danger hover:underline"
                  >
                    {t("JoinMe.deletePost")}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Right: Location Mini-Map */}
          <div className="flex flex-col">
            <div className="polaroid relative flex-1">
              <div
                aria-hidden
                className="scotch-tape absolute -top-2.5 left-1/2 z-10 h-5 w-20 -translate-x-1/2 -rotate-2"
              />
              <div className="overflow-hidden border border-border/60">
                <MapView
                  pins={[]}
                  joinMePosts={[post]}
                  locale={locale}
                  initialCenter={[post.lng, post.lat]}
                  initialZoom={11}
                  className="h-[260px] w-full lg:h-[320px]"
                />
              </div>
              <div className="flex items-center justify-between gap-2 px-1.5 pt-2">
                <span className="font-typewriter truncate text-[11px] font-bold text-ink">
                  📍 {location}
                </span>
                <span className="font-typewriter shrink-0 text-[10px] text-ink-muted">
                  {post.lat.toFixed(3)}, {post.lng.toFixed(3)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* Topic Replies Thread Card */}
      <div className="rounded-xl border-2 border-border bg-surface p-5 shadow-sm sm:p-7">
        <JoinMeThreadPanel
          post={post}
          replies={replies}
          locale={locale}
          onRepliesChange={handleRepliesChange}
        />
      </div>
    </div>
  );
}
