"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { countryFlag } from "@/lib/pin";
import {
  formatScheduleRange,
  type JoinMePost,
  type JoinMeReply,
  type JoinMeStatus,
} from "@/lib/joinMe";
import { mapJoinMeReply } from "@/lib/joinMeQueries";
import { JoinMeIcon } from "@/components/JoinMeIcon";
import { JoinMeThreadPanel } from "@/components/JoinMeThreadPanel";

export default function JoinMeDetailModal({
  post,
  locale = "en",
  onClose,
  onPostUpdated,
  onPostDeleted,
}: {
  post: JoinMePost;
  locale?: string;
  onClose: () => void;
  onPostUpdated?: (updated: JoinMePost) => void;
  onPostDeleted?: (id: string) => void;
}) {
  const t = useTranslations();
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const supabase = createClient();
  const { user, loading: authLoading } = useAuth();

  const [replies, setReplies] = useState<JoinMeReply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(true);
  const [statusBusy, setStatusBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = !authLoading && Boolean(user && user.id === post.owner_id);
  const isOpen = post.status === "open";
  const location = [post.city, post.country].filter(Boolean).join(", ");
  const schedule = formatScheduleRange(post.start_date, post.end_date, locale);

  // Open native modal dialog via showModal() + light-dismiss fallback for browsers without closedby.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!dialog.open) {
      dialog.showModal();
    }

    const handleClose = () => {
      dialog.returnValue = "";
      onClose();
    };
    dialog.addEventListener("close", handleClose);

    // Fallback light-dismiss for browsers without native `closedby="any"` (e.g. Safari).
    let cleanupFallback: (() => void) | undefined;
    if (
      typeof HTMLDialogElement !== "undefined" &&
      !("closedBy" in HTMLDialogElement.prototype)
    ) {
      const outside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        );
      };
      let pressedOutside = false;
      const onPointerDown = (e: PointerEvent) => {
        pressedOutside = outside(e);
      };
      const onPointerUp = (e: PointerEvent) => {
        if (pressedOutside && outside(e)) dialog.close();
      };
      dialog.addEventListener("pointerdown", onPointerDown);
      dialog.addEventListener("pointerup", onPointerUp);
      cleanupFallback = () => {
        dialog.removeEventListener("pointerdown", onPointerDown);
        dialog.removeEventListener("pointerup", onPointerUp);
      };
    }

    return () => {
      dialog.removeEventListener("close", handleClose);
      cleanupFallback?.();
      if (dialog.open) dialog.close();
    };
  }, [onClose]);

  // Fetch thread replies for this topic.
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("join_me_replies")
      .select(
        "id, post_id, user_id, body, intent, created_at, profiles!inner ( display_name, avatar_url )",
      )
      .eq("post_id", post.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        const mapped = (data ?? []).map((r) =>
          mapJoinMeReply(
            r as unknown as Parameters<typeof mapJoinMeReply>[0],
            t("Fallback.pinner"),
          ),
        );
        setReplies(mapped);
        setLoadingReplies(false);
      });
    return () => {
      cancelled = true;
    };
  }, [post.id, supabase, t]);

  function handleRepliesChange(next: JoinMeReply[]) {
    setReplies(next);
    const joinerCount = new Set(
      next
        .filter((r) => r.intent === "join" && r.author_id !== post.owner_id)
        .map((r) => r.author_id),
    ).size;
    onPostUpdated?.({
      ...post,
      reply_count: next.length,
      joiner_count: joinerCount,
    });
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
      onPostUpdated?.({ ...post, status: nextStatus });
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
      onPostDeleted?.(post.id);
      dialogRef.current?.close();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      {...({ closedby: "any" } as Record<string, string>)}
      className="m-auto max-h-[92vh] w-[calc(100%-1.5rem)] max-w-xl overflow-y-auto rounded-xl border-2 border-border bg-surface p-0 text-ink shadow-2xl"
    >
      {/* Top emerald dispatch stripe */}
      <div
        className={`sticky top-0 z-20 h-2 w-full ${
          isOpen ? "bg-verde" : "bg-ink-muted/50"
        }`}
      />

      <div className="space-y-5 p-5 sm:p-6">
        {/* Header row: status + city + close */}
        <div className="flex items-start justify-between gap-3">
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

          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label={t("Modal.close")}
            className="font-typewriter shrink-0 rounded border border-border bg-surface-2 px-2.5 py-1 text-xs font-bold text-ink hover:bg-kraft/40"
          >
            ✕
          </button>
        </div>

        {/* Title */}
        <div>
          <h2 id={titleId} className="font-display text-xl font-bold text-ink sm:text-2xl">
            {post.title}
          </h2>

          {/* Host info */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-border pb-3">
            <Link
              href={`/users/${post.owner_id}`}
              className="flex items-center gap-2 hover:underline"
            >
              <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-2 text-xs">
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
              <span className="font-typewriter text-xs font-bold text-ink">
                {t("JoinMe.hostedBy")} {post.owner_display_name}
              </span>
            </Link>

            <Link
              href={`/join-me/${post.id}`}
              className="font-typewriter text-xs font-bold text-verde hover:underline"
            >
              {t("JoinMe.openFullThread")}
            </Link>
          </div>
        </div>

        {/* Schedule box */}
        <div className="rounded-lg border border-verde/35 bg-verde/8 p-3.5">
          <p className="font-typewriter text-[10px] font-bold uppercase tracking-[0.18em] text-verde">
            📅 {t("JoinMe.scheduleLabel")}
          </p>
          <p className="font-display mt-1 text-base font-bold text-ink">
            {schedule}
          </p>
          {post.schedule_note && (
            <p className="font-typewriter mt-1 text-xs text-ink-muted">
              🕒 {post.schedule_note}
            </p>
          )}
        </div>

        {/* Details */}
        {post.details && (
          <p className="journal-lined whitespace-pre-wrap rounded-md border border-border px-3.5 py-2 text-sm text-ink">
            {post.details}
          </p>
        )}

        {/* Owner quick actions */}
        {isOwner && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-y border-dashed border-border py-3">
            <button
              type="button"
              onClick={toggleStatus}
              disabled={statusBusy}
              className="font-typewriter rounded border border-border bg-surface-2 px-3 py-1 text-xs font-bold text-ink hover:border-verde hover:text-verde disabled:opacity-50"
            >
              {isOpen ? t("JoinMe.markClosed") : t("JoinMe.markOpen")}
            </button>

            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  disabled={deleting}
                  autoFocus
                  className="font-typewriter rounded border border-border px-2.5 py-1 text-xs font-bold text-ink-muted hover:bg-surface-2"
                >
                  {t("Modal.keep")}
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="font-typewriter rounded border border-danger bg-danger px-2.5 py-1 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {deleting ? t("Modal.deleting") : t("Modal.delete")}
                </button>
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

        {/* Inline Thread Replies */}
        {loadingReplies ? (
          <p className="font-typewriter py-4 text-center text-xs text-ink-muted">
            …
          </p>
        ) : (
          <JoinMeThreadPanel
            post={post}
            replies={replies}
            locale={locale}
            onRepliesChange={handleRepliesChange}
            compact
          />
        )}
      </div>
    </dialog>
  );
}
