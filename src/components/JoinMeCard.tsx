"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { countryFlag } from "@/lib/pin";
import { formatScheduleRange, type JoinMePost } from "@/lib/joinMe";
import { JoinMeIcon } from "@/components/JoinMeIcon";

export function JoinMeCard({
  post,
  locale = "en",
  onClick,
}: {
  post: JoinMePost;
  locale?: string;
  onClick?: () => void;
}) {
  const t = useTranslations("JoinMe");
  const location = [post.city, post.country].filter(Boolean).join(", ");
  const schedule = formatScheduleRange(post.start_date, post.end_date, locale);
  const isOpen = post.status === "open";

  const content = (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border-2 border-border bg-surface shadow-sm transition hover:-translate-y-0.5 hover:border-verde/70 hover:shadow-md">
      {/* Top emerald dispatch bar */}
      <div
        className={`h-1.5 w-full ${
          isOpen ? "bg-verde" : "bg-ink-muted/40"
        }`}
      />

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {/* Top row: city luggage tag + status stamp */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="luggage-tag max-w-full truncate">
            {post.country && (
              <span aria-hidden>{countryFlag(post.country)}</span>
            )}
            <span className="truncate">{location || post.city}</span>
          </span>

          <span
            className={`rubber-stamp shrink-0 text-[10px] ${
              isOpen ? "text-verde" : "text-ink-muted"
            }`}
          >
            <JoinMeIcon className="h-3 w-3" />
            {isOpen ? t("statusOpen") : t("statusClosed")}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-display mt-3 line-clamp-2 text-lg font-bold leading-snug text-ink group-hover:text-verde">
          {post.title}
        </h3>

        {/* Schedule box */}
        <div className="mb-3 mt-2.5 rounded-lg border border-dashed border-border bg-surface-2/65 px-3 py-2">
          <p className="font-typewriter text-xs font-bold text-ink">
            📅 {schedule}
          </p>
          {post.schedule_note && (
            <p className="font-typewriter mt-0.5 line-clamp-1 text-[11px] text-ink-muted">
              🕒 {post.schedule_note}
            </p>
          )}
        </div>

        {/* Details preview */}
        {post.details && (
          <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-ink-muted">
            {post.details}
          </p>
        )}

        {/* Footer: host + thread counters */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-border pt-3.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface-2 text-xs">
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
            <span className="font-typewriter truncate text-xs font-bold text-ink">
              {post.owner_display_name}
            </span>
          </div>

          <div className="font-typewriter flex items-center gap-2 text-[11px] font-bold">
            {post.joiner_count > 0 && (
              <span className="rounded bg-verde/15 px-2 py-0.5 text-verde">
                🙋 {t("joinerCount", { count: post.joiner_count })}
              </span>
            )}
            <span className="rounded bg-surface-2 px-2 py-0.5 text-ink-muted">
              💬 {t("replyCount", { count: post.reply_count })}
            </span>
          </div>
        </div>
      </div>
    </article>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block h-full w-full text-left">
        {content}
      </button>
    );
  }

  return (
    <Link href={`/join-me/${post.id}`} className="block h-full">
      {content}
    </Link>
  );
}
