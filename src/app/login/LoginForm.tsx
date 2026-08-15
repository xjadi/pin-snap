"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const t = useTranslations("Auth");
  const supabase = createClient();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const redirectTo = `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback${
    next ? `?next=${encodeURIComponent(next)}` : ""
  }`;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      setStatus("error");
      setError(error.message);
      return;
    }

    setStatus("sent");
  }

  async function signInWithGoogle() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      setError(error.message);
    }
  }

  const inputClass =
    "mt-1 w-full rounded-xl border border-border bg-surface px-4 py-2.5 outline-none focus:border-magenta focus:ring-2 focus:ring-magenta/20";

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-ink">
          {t("email")}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
            className={inputClass}
          />
        </label>

        <button
          type="submit"
          disabled={status === "sending"}
          className="w-full rounded-xl bg-magenta px-4 py-2.5 font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "sending" ? t("sending") : t("sendMagicLink")}
        </button>
      </form>

      <div className="flex items-center gap-3 py-1 text-xs text-ink-muted">
        <span className="h-px flex-1 bg-border" />
        {t("orDivider")}
        <span className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        onClick={signInWithGoogle}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 font-medium text-ink shadow-sm transition hover:bg-surface-2"
      >
        <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
          <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
          <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
          <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 33.962 44 24c0-1.341-.138-2.65-.389-3.917z" />
        </svg>
        {t("google")}
      </button>

      {status === "sent" && (
        <p className="rounded-xl bg-verde/10 p-3 text-sm text-verde">
          {t("checkInbox", { email })}
        </p>
      )}

      {status === "error" && error && (
        <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>
      )}
    </div>
  );
}