"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_COOKIE, type Locale } from "@/i18n/constants";

export function LanguageToggle() {
  const t = useTranslations("Lang");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next: Locale = locale === "en" ? "th" : "en";
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div
      className="font-typewriter inline-flex items-center rounded border border-border bg-surface p-0.5 text-[11px]"
      role="group"
      aria-label={t("toggle")}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        className={`rounded-xs px-2 py-0.5 font-bold transition ${
          locale === "en"
            ? "bg-magenta text-white"
            : "text-ink-muted hover:text-ink"
        }`}
      >
        {t("en")}
      </button>
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        className={`rounded-xs px-2 py-0.5 font-bold transition ${
          locale === "th"
            ? "bg-magenta text-white"
            : "text-ink-muted hover:text-ink"
        }`}
      >
        {t("th")}
      </button>
    </div>
  );
}