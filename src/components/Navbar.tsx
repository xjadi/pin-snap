"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { SignOutButton } from "@/components/SignOutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Navbar() {
  const { user, loading } = useAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-stone-200/80 bg-white/85 backdrop-blur dark:border-stone-800/80 dark:bg-stone-950/85">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-2 text-lg font-semibold tracking-tight"
        >
          <span aria-hidden className="text-2xl">
            📌
          </span>
          <span>
            Pin<span className="text-amber-600">Snap</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 text-sm sm:gap-4">
          <Link
            href="/users"
            className="rounded-full px-3 py-1.5 text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            People
          </Link>

          <ThemeToggle />

          {loading ? null : user ? (
            <>
              <Link
                href="/add"
                className="rounded-full bg-amber-500 px-3 py-1.5 font-medium text-white shadow-sm transition hover:bg-amber-600"
              >
                Add pin
              </Link>
              <Link
                href="/profile"
                className="rounded-full px-3 py-1.5 text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                Profile
              </Link>
              <SignOutButton />
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-stone-900 px-4 py-1.5 font-medium text-white hover:bg-stone-800 dark:bg-amber-500 dark:hover:bg-amber-600"
            >
              Log in
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}