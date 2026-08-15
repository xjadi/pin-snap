"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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

const inputClass =
  "mt-1 w-full rounded-xl border border-border bg-surface px-4 py-2.5 outline-none focus:border-magenta focus:ring-2 focus:ring-magenta/20";
const labelClass = "block text-sm font-medium text-ink";

export default function ProfileEditor({
  initial,
  email,
}: {
  initial: Profile | undefined;
  email: string;
}) {
  const t = useTranslations("Profile");
  const tCommon = useTranslations("Onboarding");
  const tFallback = useTranslations("Fallback");
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
      setError(tCommon("notLoggedIn"));
      setSaving(false);
      return;
    }

    const { error: upsertError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          display_name: displayName.trim() || email.split("@")[0] || tFallback("pinner"),
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
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-surface-2 ring-2 ring-sun/40">
          {avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
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
                  avatarUrl === url ? "ring-magenta" : "ring-border hover:ring-magenta/40"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="preset" className="h-10 w-10" />
              </button>
            ))}
          </div>

          <label className={labelClass}>
            {t("avatarLink")} <span className="text-ink-muted">{t("avatarOrPreset")}</span>
            <input
              type="url"
              value={avatarUrl.startsWith("https://api.dicebear.com") ? "" : avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder={tCommon("avatarPlaceholder")}
              className={inputClass}
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              {tCommon("displayName")}
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("displayNamePlaceholder")}
                className={inputClass}
              />
            </label>

            <label className={labelClass}>
              {t("email")}
              <input
                type="text"
                value={email}
                disabled
                className={`${inputClass} border-border/50 bg-surface-2 text-ink-muted`}
              />
            </label>
          </div>

          <label className={labelClass}>
            {tCommon("bio")} <span className="text-ink-muted">{tCommon("optional")}</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              placeholder={t("bioPlaceholder")}
              className={inputClass}
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-magenta px-5 py-2.5 font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
            >
              {saving ? t("saving") : t("save")}
            </button>
            {saved && !error && (
              <span className="text-sm text-verde">{t("saved")}</span>
            )}
            {error && (
              <span className="text-sm text-danger">{error}</span>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}