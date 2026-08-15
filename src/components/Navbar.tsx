"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAuth } from "@/components/AuthProvider";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";

export function Navbar() {
  const t = useTranslations("Nav");
  const { user, loading } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-paper/85 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="font-display flex items-center gap-2 text-lg font-bold tracking-tight"
        >
          <span aria-hidden className="text-2xl">
            📌
          </span>
          <span>
            Pin<span className="text-magenta">Snap</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 text-sm sm:gap-3">
          <Link
            href="/users"
            className="rounded-full px-3 py-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink"
          >
            {t("people")}
          </Link>

          <LanguageToggle />
          <ThemeToggle />

          {loading ? null : user ? (
            <>
              <Link
                href="/add"
                className="rounded-full bg-magenta px-3 py-1.5 font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                {t("addPin")}
              </Link>
              <Link
                href="/profile"
                className="rounded-full px-3 py-1.5 text-ink-muted hover:bg-surface-2 hover:text-ink"
              >
                {t("profile")}
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-ink px-4 py-1.5 font-semibold text-paper transition hover:opacity-80 dark:bg-magenta dark:text-white"
            >
              {t("logIn")}
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}