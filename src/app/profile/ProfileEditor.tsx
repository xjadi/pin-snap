"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

const PRESET_AVATARS = [
  "https://api.dicebear.com/9.x/thumbs/svg?seed=Mochi&backgroundColor=ffd5a8",
  "https://api.dicebear.com/9.x/thumbs/svg?seed=Latte&backgroundColor=c0aede",
  "https://api.dicebear.com/9.x/thumbs/svg?seed=Somtum&backgroundColor=b6e3f4",
  "https://api.dicebear.com/9.x/thumbs/svg?seed=Boba&backgroundColor=ffdfbf",
  "https://api.dicebear.com/9.x/thumbs/svg?seed=Tofu&backgroundColor=d1f5c4",
  "https://api.dicebear.com/9.x/thumbs/svg?seed=Mango&backgroundColor=ffd6d6",
];

export default function ProfileEditor({
  initial,
  email,
}: {
  initial: Profile | undefined;
  email: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [displayName, setDisplayName] = useState(initial?.display_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(initial?.avatar_url ?? "");
  const [bio, setBio] = useState(initial?.bio ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not logged in.");
      setSaving(false);
      return;
    }

    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          display_name: displayName.trim() || email.split("@")[0] || "Pinner",
          avatar_url: avatarUrl.trim(),
          bio: bio.trim(),
        },
        { onConflict: "id" },
      );

    setSaving(false);
    if (upsertError) {
      setError(upsertError.message);
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-stone-100 ring-2 ring-amber-200">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="avatar"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-4xl">🙂</span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 space-y-4">
          <div className="grid grid-cols-6 gap-2">
            {PRESET_AVATARS.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => setAvatarUrl(url)}
                className={`overflow-hidden rounded-full ring-2 transition ${
                  avatarUrl === url ? "ring-amber-500" : "ring-stone-200 hover:ring-amber-300"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="preset" className="h-10 w-10" />
              </button>
            ))}
          </div>

          <label className="block text-sm font-medium text-stone-700">
            Avatar link <span className="text-stone-400">(or pick a preset)</span>
            <input
              type="url"
              value={avatarUrl.startsWith("https://api.dicebear.com") ? "" : avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…/avatar.png"
              className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-stone-700">
              Display name
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Bangkok Explorer"
                className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
              />
            </label>

            <label className="block text-sm font-medium text-stone-700">
              Email
              <input
                type="text"
                value={email}
                disabled
                className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-stone-400"
              />
            </label>
          </div>

          <label className="block text-sm font-medium text-stone-700">
            Bio
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder="A little about you…"
              className="mt-1 w-full rounded-xl border border-stone-300 px-4 py-2.5 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-amber-500 px-5 py-2.5 font-medium text-white shadow-sm transition hover:bg-amber-600 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save profile"}
            </button>
            {saved && !error && (
              <span className="text-sm text-emerald-600">Saved!</span>
            )}
            {error && (
              <span className="text-sm text-rose-600">{error}</span>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}