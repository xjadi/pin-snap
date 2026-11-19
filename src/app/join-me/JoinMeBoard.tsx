"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import { JoinMeCard } from "@/components/JoinMeCard";
import { JoinMeIcon } from "@/components/JoinMeIcon";
import { JoinMeComposer } from "@/app/join-me/JoinMeComposer";
import { isUpcomingPost, type JoinMePost } from "@/lib/joinMe";

type BoardFilter = "all" | "open" | "upcoming" | "mine";

export default function JoinMeBoard({
  initialPosts,
  locale = "en",
  initialCompose = false,
}: {
  initialPosts: JoinMePost[];
  locale?: string;
  initialCompose?: boolean;
}) {
  const t = useTranslations("JoinMe");
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [posts, setPosts] = useState<JoinMePost[]>(initialPosts);
  const [filter, setFilter] = useState<BoardFilter>("all");
  const [search, setSearch] = useState("");
  const [showComposer, setShowComposer] = useState(initialCompose);

  const visiblePosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((p) => {
      if (filter === "open" && p.status !== "open") return false;
      if (filter === "upcoming" && !isUpcomingPost(p)) return false;
      if (filter === "mine" && (!user || p.owner_id !== user.id)) return false;
      if (q) {
        const hay = `${p.title} ${p.city} ${p.country} ${p.details} ${p.owner_display_name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [posts, filter, search, user]);

  function handleCreated(newPost: JoinMePost) {
    setPosts((prev) => [newPost, ...prev]);
    setShowComposer(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Board Header */}
      <div className="relative overflow-hidden rounded-xl border-2 border-border bg-surface shadow-sm">
        <div className="airmail-stripe" />
        <div className="flex flex-wrap items-end justify-between gap-4 p-5 sm:p-7">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="luggage-tag">{t("boardEyebrow")}</span>
              <span className="rubber-stamp -rotate-2 text-[10px] text-verde">
                <JoinMeIcon className="h-3 w-3" />
                {t("boardStamp")}
              </span>
            </div>
            <h1 className="font-display mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {t("boardTitle")}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">{t("boardSubtitle")}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/?layer=join-me#community-map"
              className="font-typewriter inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-ink transition hover:border-verde hover:text-verde"
            >
              🗺️ {t("viewOnMap")}
            </Link>

            {authLoading ? null : user ? (
              <button
                type="button"
                onClick={() => setShowComposer((v) => !v)}
                className="font-typewriter inline-flex items-center gap-1.5 rounded-lg border-2 border-ink bg-verde px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-[3px_3px_0px_var(--ink)] transition hover:translate-y-[-1px] hover:opacity-95"
              >
                {showComposer ? t("cancel") : t("newPostCta")}
              </button>
            ) : (
              <Link
                href="/login?next=%2Fjoin-me%3Fcompose%3D1"
                className="font-typewriter inline-flex items-center gap-1.5 rounded-lg border-2 border-ink bg-verde px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-[3px_3px_0px_var(--ink)] transition hover:translate-y-[-1px] hover:opacity-95"
              >
                {t("signInToPost")}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Inline Post Composer */}
      {showComposer && user && (
        <JoinMeComposer
          existingPosts={posts}
          locale={locale}
          onSaved={handleCreated}
          onCancel={() => setShowComposer(false)}
        />
      )}

      {/* Filter tabs + City/Topic search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Board filters"
          className="font-typewriter inline-flex flex-wrap rounded-lg border border-border bg-surface p-0.5 text-xs"
        >
          {(
            [
              ["all", t("filterAll")],
              ["open", t("filterOpen")],
              ["upcoming", t("filterUpcoming")],
              ...(user ? ([["mine", t("filterMine")]] as const) : []),
            ] as Array<[BoardFilter, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={`rounded-md px-3 py-1.5 font-bold uppercase tracking-wider transition ${
                filter === key
                  ? "bg-verde text-white"
                  : "text-ink-muted hover:bg-surface-2 hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-muted">
            🔎
          </span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="font-typewriter w-full rounded-lg border border-border bg-surface py-1.5 pl-8 pr-3 text-xs text-ink outline-none focus:border-verde focus:ring-2 focus:ring-verde/20"
          />
        </div>
      </div>

      {/* Topic Board Grid */}
      {posts.length === 0 ? (
        <div className="deckle-note rounded-xl p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-verde/15 text-verde">
            <JoinMeIcon className="h-6 w-6" />
          </div>
          <p className="font-typewriter mt-3 text-sm text-ink-muted">
            {t("emptyBoard")}
          </p>
          {user && !showComposer && (
            <button
              type="button"
              onClick={() => setShowComposer(true)}
              className="font-typewriter mt-4 rounded-lg border-2 border-ink bg-verde px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-[2px_2px_0px_var(--ink)]"
            >
              {t("newPostCta")}
            </button>
          )}
        </div>
      ) : visiblePosts.length === 0 ? (
        <div className="deckle-note rounded-xl p-10 text-center">
          <p className="font-typewriter text-sm text-ink-muted">
            {t("emptyFiltered")}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visiblePosts.map((post) => (
            <JoinMeCard key={post.id} post={post} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
