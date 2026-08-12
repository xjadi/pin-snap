"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types";

const PRESET_AVATARS = [
  "https://api.dicebear.com/9.x/thumbs/svg?seed=Mochi&backgroundColor=ffd5a8",
  "https://api.dicebear.com/9.x/thumbs/svg?seed=Latte&backgroundColor=c0aede",
  "https://api.dicebear.com/9.x/thumbs/svg?seed=Somtum&backgroundColor=b6e3f4",
  "https://api.dicebear.com/9.x/thumbs/svg?seed=Boba&backgroundColor=ffdfbf",
  "https://api.dicebear.com/9.x/thumbs/svg?seed=Tofu&backgroundColor=d1f5c4",
  "https://api.dicebear.com/9.x/thumbs/svg?seed=Mango&backgroundColor=ffd6d6",
];

export default function OnboardingForm({
  initial,
  email,
}: {
  initial:
    | Partial<Pick<Database["public"]["Tables"]["profiles"]["Row"], "display_name" | "avatar_url" | "bio">>
    | undefined;
  email: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [displayName, setDisplayName] = useState(initial?.display_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initial?.avatar_url ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not logged in.");
      setSaving(false);
      return;
    }

    const payload = {
      id: user.id,
      display_name: displayName.trim() || email.split("@")[0] || "Pinner",
      avatar_url: avatarUrl.trim(),
      bio: bio.trim(),
    };

    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" });

    setSaving(false);
    if (upsertError) {
      setError(upsertError.message);
      return;
    }

    router.push("/add");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <span className="block text-sm font-medium text-stone-700 dark:text-stone-200">
          Avatar preview
        </span>
        <div className="mt-2 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-stone-100 ring-2 ring-amber-200 dark:bg-stone-800">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="avatar preview"
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <span className="text-3xl">🙂</span>
          )}
        </div>
      </div>

      <div>
        <span className="block text-sm font-medium text-stone-700 dark:text-stone-200">
          Pick a preset
        </span>
        <div className="mt-2 grid grid-cols-6 gap-2">
          {PRESET_AVATARS.map((url) => (
            <button
              key={url}
              type="button"
              onClick={() => setAvatarUrl(url)}
              className={`overflow-hidden rounded-full ring-2 transition ${
                avatarUrl === url ? "ring-amber-500" : "ring-stone-200 hover:ring-amber-300 dark:ring-stone-700 dark:hover:ring-amber-400"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="preset" className="h-10 w-10" />
            </button>
          ))}
        </div>
      </div>

      <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
        …or paste an avatar image link
        <input
          type="url"
          value={avatarUrl.startsWith("https://api.dicebear.com") ? "" : avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder="https://…/your-avatar.png"
          className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
        />
      </label>

      <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
        Display name
        <input
          type="text"
          required
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Somtum Lover"
          className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
        />
      </label>

      <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
        Bio <span className="text-stone-400 dark:text-stone-500">(optional)</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="A little about you and the places you love…"
          rows={3}
          className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
        />
      </label>

      {error && (
        <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl bg-amber-500 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save & start pinning"}
      </button>
    </form>
  );
}