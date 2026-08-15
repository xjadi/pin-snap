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
      className="inline-flex items-center rounded-full border border-border p-0.5 text-xs"
      role="group"
      aria-label={t("toggle")}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        className={`rounded-full px-2 py-0.5 font-semibold transition ${
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
        className={`rounded-full px-2 py-0.5 font-semibold transition ${
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