"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const t = useTranslations("Theme");
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      suppressHydrationWarning
      aria-label={isDark ? t("toggleLight") : t("toggleDark")}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="rounded-full px-3 py-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink"
    >
      <span aria-hidden className="text-base">
        {isDark ? "☀️" : "🌙"}
      </span>
    </button>
  );
}