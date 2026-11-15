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
    <header className="sticky top-0 z-50 border-b-2 border-border bg-paper/92 backdrop-blur">
      <div className="airmail-stripe !h-[4px]" />
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
        <Link
          href="/"
          className="group flex items-center gap-2.5"
        >
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded border border-border bg-surface text-lg shadow-xs transition group-hover:-rotate-6"
          >
            📌
          </span>
          <div className="leading-none">
            <span className="font-display block text-lg font-bold tracking-tight">
              Pin<span className="text-magenta">Snap</span>
            </span>
            <span className="font-typewriter block text-[9px] font-bold uppercase tracking-[0.18em] text-ink-muted">
              FIELD JOURNAL
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-1.5 text-sm sm:gap-2.5">
          <Link
            href="/users"
            className="font-typewriter rounded-md border border-transparent px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted transition hover:border-border hover:bg-surface-2 hover:text-ink"
          >
            {t("people")}
          </Link>

          <LanguageToggle />
          <ThemeToggle />

          {loading ? null : user ? (
            <>
              <Link
                href="/add"
                className="font-typewriter rounded-md border-2 border-ink bg-magenta px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-[2px_2px_0px_var(--ink)] transition hover:translate-y-[-1px] hover:opacity-95"
              >
                + {t("addPin")}
              </Link>
              <Link
                href="/profile"
                className="font-typewriter rounded-md border border-transparent px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted transition hover:border-border hover:bg-surface-2 hover:text-ink"
              >
                {t("profile")}
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="font-typewriter rounded-md border-2 border-ink bg-ink px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-paper shadow-[2px_2px_0px_var(--magenta)] transition hover:opacity-90 dark:border-border dark:bg-magenta dark:text-white"
            >
              {t("logIn")}
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}