"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const next = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);

    const redirectTo = `${window.location.origin}/auth/callback${
      next ? `?next=${encodeURIComponent(next)}` : ""
    }`;

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-sm font-medium text-stone-700">
        Email
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
        />
      </label>

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-xl bg-amber-500 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : "Send magic link"}
      </button>

      {status === "sent" && (
        <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
          Check your inbox — we sent a sign-in link to{" "}
          <span className="font-medium">{email}</span>. Click it to continue.
        </p>
      )}

      {status === "error" && error && (
        <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>
      )}
    </form>
  );
}