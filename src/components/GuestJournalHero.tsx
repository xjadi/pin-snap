"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import type { MapPin, PinSummary } from "@/lib/pin";

export default function GuestJournalHero({
  initialIsSignedIn,
  pins,
  summary,
}: {
  initialIsSignedIn: boolean;
  pins: MapPin[];
  summary: PinSummary;
}) {
  const t = useTranslations("Landing");
  const tJoinMe = useTranslations("JoinMe");
  const { user, loading } = useAuth();
  const isSignedIn = loading ? initialIsSignedIn : Boolean(user);

  // When signed in, collapse the guest spread hero so the map & journal feed lead immediately.
  if (isSignedIn) {
    return (
      <section className="relative mb-6 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <div className="airmail-stripe" />
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="luggage-tag">{t("signedInBannerTag")}</span>
              <span className="font-typewriter text-xs text-ink-muted">
                {t("journalDate")}
              </span>
            </div>
            <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">
              {t("heroLine1")}{" "}
              <span className="text-ink-muted">{t("heroLine2")}</span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/join-me?compose=1"
              className="font-typewriter inline-flex items-center gap-1.5 rounded-lg border-2 border-verde bg-verde px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:opacity-90"
            >
              {tJoinMe("newPostCta")}
            </Link>
            <Link
              href="/add"
              className="font-typewriter inline-flex items-center gap-2 rounded-lg border-2 border-magenta bg-magenta px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:opacity-90"
            >
              {t("signedInAddCta")}
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Build 5 rows for the Library Checkout / Running Log Card on the right page.
  const realRows = pins.slice(0, 5).map((p) => {
    const rawDate = p.visited_at || p.created_at;
    const formattedDate = formatShortJournalDate(rawDate);
    const place = [p.city, p.country].filter(Boolean).join(", ");
    const label = p.title
      ? `${place ? `${place} — ` : ""}${p.title}`
      : `${place || "Thailand"} (${p.owner_display_name})`;
    return { date: formattedDate, text: label };
  });

  const fallbackRows = [
    { date: "05.11.26", text: t("sampleRow1") },
    { date: "05.12.26", text: t("sampleRow2") },
    { date: "05.14.26", text: t("sampleRow3") },
    { date: "05.15.26", text: t("sampleRow4") },
  ];

  const logRows = realRows.length > 0 ? realRows : fallbackRows;
  const featuredPin = pins[0] ?? null;

  return (
    <section className="mb-10">
      {/* Top desk dispatch strip */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="luggage-tag">{t("journalEdition")}</span>
          <span className="font-typewriter text-xs text-ink-muted">
            {t("journalDate")}
          </span>
        </div>

        <div className="flex items-center gap-2 text-ink-muted">
          <PostmarkWaves />
          <span className="font-typewriter text-[11px] font-bold uppercase tracking-[0.2em] text-magenta">
            {t("eyebrow")}
          </span>
        </div>
      </div>

      {/* Open Two-Page Travel Journal Spread */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-border bg-surface shadow-[0_18px_44px_rgba(24,16,8,0.16)]">
        {/* Top airmail trim */}
        <div className="airmail-stripe" />

        {/* Center book spine crease & black ribbon bookmark on desktop */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-1/2 z-20 hidden w-8 -translate-x-1/2 lg:block"
          style={{
            background:
              "linear-gradient(to right, transparent 0%, rgba(24,16,8,0.09) 42%, rgba(24,16,8,0.22) 50%, rgba(24,16,8,0.08) 58%, transparent 100%)",
          }}
        >
          {/* Black woven ribbon bookmark hanging down the spine */}
          <div className="mx-auto h-[88%] w-2.5 bg-[#1c1815] shadow-md">
            <div
              className="mt-auto h-full w-full"
              style={{
                borderLeft: "1px solid rgba(255,255,255,0.12)",
                borderRight: "1px solid rgba(0,0,0,0.4)",
              }}
            />
          </div>
          {/* Ribbon V-notch tip */}
          <div
            className="mx-auto h-0 w-0"
            style={{
              borderLeft: "5px solid #1c1815",
              borderRight: "5px solid #1c1815",
              borderBottom: "6px solid transparent",
            }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* LEFT PAGE: Deckled Typewriter Entry Sheet + Official Rubber Stamp */}
          <div className="relative border-b border-border p-5 sm:p-8 lg:border-b-0 lg:border-r lg:pr-10">
            <div className="deckle-note relative rounded-sm p-5 sm:p-7">
              {/* Top strip of translucent Scotch tape */}
              <div
                aria-hidden
                className="scotch-tape absolute -top-3 left-1/2 h-6 w-28 -translate-x-1/2 -rotate-2"
              />

              {/* Typewriter date & weather header */}
              <div className="font-typewriter border-b border-dashed border-border pb-3 text-xs leading-relaxed text-ink-muted">
                <p className="font-bold text-ink">{t("eyebrow")}</p>
                <p>{t("journalWeather")}</p>
              </div>

              {/* Bilingual Hero Title */}
              <h1 className="font-display mt-4 text-2xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">
                {t("heroLine1")}
                <br />
                <span className="text-magenta">{t("heroLine2")}</span>
              </h1>

              <p className="mt-3 text-sm leading-relaxed text-ink-muted sm:text-base">
                {t("subtitle")} 🇹🇭
              </p>

              {/* Typewriter field checklist */}
              <ul className="font-typewriter mt-5 space-y-2 border-t border-dashed border-border pt-4 text-xs text-ink sm:text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-magenta">▸</span>
                  <span>{t("step1")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-magenta">▸</span>
                  <span>{t("step2")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-magenta">▸</span>
                  <span>{t("step3")}</span>
                </li>
              </ul>

              {/* Bottom row: CTAs + Rotary Oval Official Stamp */}
              <div className="mt-6 flex flex-wrap items-end justify-between gap-4 pt-2">
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/login"
                    className="font-typewriter inline-flex items-center gap-2 rounded-lg border-2 border-ink bg-magenta px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-[3px_3px_0px_var(--ink)] transition hover:translate-y-[-1px] hover:shadow-[4px_4px_0px_var(--ink)] sm:text-sm"
                  >
                    <span>✉️</span>
                    <span>{t("startJournalCta")}</span>
                  </Link>

                  <a
                    href="#community-map"
                    className="font-typewriter rounded-lg border border-border bg-surface px-3.5 py-2.5 text-xs font-bold text-ink-muted transition hover:border-ink hover:text-ink"
                  >
                    {t("exploreMapCta")}
                  </a>
                </div>

                {/* Oval Official Rubber Postmark Stamp (like bottom-left of reference journal) */}
                <div
                  aria-hidden
                  className="-rotate-6 select-none rounded-[50%] border-2 border-double border-magenta/85 px-4 py-2 text-center text-magenta opacity-85"
                >
                  <p className="font-typewriter text-[10px] font-bold tracking-[0.18em]">
                    ★ {t("stampOfficial")} ★
                  </p>
                  <p className="font-typewriter text-[9px] tracking-[0.12em]">
                    {t("stampSub")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT PAGE: Kraft Envelope Pocket + Library Running Log Card + Taped Polaroid */}
          <div className="relative flex flex-col justify-between bg-surface-2/45 p-5 sm:p-8 lg:pl-10">
            {/* Top-right peeking Taped Polaroid & Postcard Ephemera */}
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <span className="rubber-stamp text-[10px] text-navy">
                  {t("airmailTag")}
                </span>
                <p className="font-typewriter text-xs text-ink-muted">
                  {summary.totalPins} {t("statsLabel")} · {summary.totalCountries} countries ·{" "}
                  {summary.totalCities} cities
                </p>
              </div>

              {/* Mini Taped Polaroid peeking at top right */}
              <div className="polaroid relative w-32 shrink-0 rotate-3 sm:w-36">
                <div
                  aria-hidden
                  className="scotch-tape absolute -top-2.5 left-1/2 z-10 h-5 w-16 -translate-x-1/2 rotate-2"
                />
                {featuredPin ? (
                  <div className="aspect-[4/3] w-full overflow-hidden bg-surface-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={featuredPin.photo_url}
                      alt={featuredPin.title ?? featuredPin.city}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-[4/3] w-full flex-col items-center justify-center bg-surface-2 text-center">
                    <span className="text-2xl">📸</span>
                    <span className="font-typewriter mt-0.5 text-[10px] text-ink-muted">
                      THAILAND
                    </span>
                  </div>
                )}
                <p className="font-typewriter truncate px-1.5 pt-1 text-[10px] font-bold text-ink">
                  {featuredPin
                    ? [featuredPin.city, featuredPin.country].filter(Boolean).join(", ") ||
                      featuredPin.title ||
                      "Pinned"
                    : "Bangkok, TH"}
                </p>
              </div>
            </div>

            {/* Library Checkout / Running Log Card tucked in a Kraft Pocket */}
            <div className="relative mx-auto w-full max-w-md">
              {/* Kraft paper pocket backing */}
              <div
                aria-hidden
                className=" absolute -inset-x-2 -bottom-2 top-8 rounded-b-lg border border-border bg-kraft/55 shadow-inner"
              />

              {/* The Ruled Library Index Card */}
              <div className="library-card relative z-10 -rotate-1 rounded-sm p-4 text-ink sm:p-5">
                {/* Author / Title boxes */}
                <div className="border-2 border-ink/75 text-xs">
                  <div className="flex border-b border-ink/75">
                    <span className="font-typewriter w-20 shrink-0 border-r border-ink/75 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                      {t("logCardAuthorLabel")}
                    </span>
                    <span className="font-typewriter truncate px-2.5 py-1 font-bold text-ink">
                      {t("logCardAuthorValue")}
                    </span>
                  </div>
                  <div className="flex border-b border-ink/75">
                    <span className="font-typewriter w-20 shrink-0 border-r border-ink/75 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                      {t("logCardTitleLabel")}
                    </span>
                    <span className="font-typewriter truncate px-2.5 py-1 font-bold text-magenta">
                      {t("logCardTitleValue")}
                    </span>
                  </div>

                  {/* Column headers: DATE | DESTINATION / PINNER */}
                  <div className="grid grid-cols-[5.5rem_1fr] border-b border-ink/75 bg-surface/35 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                    <span className="font-typewriter border-r border-ink/75 px-2 py-1">
                      {t("logCardColDate")}
                    </span>
                    <span className="font-typewriter px-2.5 py-1">
                      {t("logCardColPlace")}
                    </span>
                  </div>

                  {/* Ruled typewriter rows */}
                  <div className="divide-y divide-ink/35">
                    {logRows.map((row, idx) => (
                      <div
                        key={idx}
                        className="font-typewriter grid grid-cols-[5.5rem_1fr] text-xs leading-7"
                      >
                        <span className="border-r border-ink/50 px-2 text-[11px] text-ink-muted">
                          {row.date}
                        </span>
                        <span className="truncate px-2.5 font-bold text-ink">
                          {row.text}
                        </span>
                      </div>
                    ))}
                    {/* Extra blank ruled lines like a real library card */}
                    <div className="grid h-7 grid-cols-[5.5rem_1fr]">
                      <span className="border-r border-ink/50" />
                      <span />
                    </div>
                  </div>
                </div>
              </div>

              {/* Gold Foil Embossed Seal Sticker on bottom-right corner */}
              <div
                aria-hidden
                className=" font-typewriter absolute -bottom-3 -right-2 z-20 flex h-16 w-16 rotate-12 items-center justify-center rounded-full border-2 border-dashed border-[#9e6f08] bg-gradient-to-br from-[#f8d568] via-[#d99b16] to-[#b57c0a] p-1.5 text-center text-[8px] font-bold uppercase leading-tight tracking-wider text-[#2b1c02] shadow-md"
              >
                ★ {t("sealText")} ★
              </div>
            </div>

            {/* Bottom feature luggage tags */}
            <div className="mt-6 flex flex-wrap items-center gap-2 pt-2">
              <span className="luggage-tag">🎞️ {t("badgeTapedPhotos")}</span>
              <span className="luggage-tag">✈️ {t("badgePostcards")}</span>
              <span className="luggage-tag">🏷️ {t("badgeLuggageTags")}</span>
              <span className="luggage-tag">✉️ {t("badgeMagicLink")}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatShortJournalDate(isoOrDate: string): string {
  if (!isoOrDate) return "11.15.26";
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return isoOrDate.slice(0, 10);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}.${dd}.${yy}`;
}

function PostmarkWaves() {
  return (
    <svg
      className="h-4 w-14 text-ink-muted/70"
      viewBox="0 0 80 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 5 C 10 1, 18 9, 26 5 C 34 1, 42 9, 50 5 C 58 1, 66 9, 78 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M2 10 C 10 6, 18 14, 26 10 C 34 6, 42 14, 50 10 C 58 6, 66 14, 78 10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M2 15 C 10 11, 18 19, 26 15 C 34 11, 42 19, 50 15 C 58 11, 66 19, 78 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
