"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
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

const inputClass =
  "mt-1 w-full rounded-xl border border-border bg-surface px-4 py-2.5 outline-none focus:border-magenta focus:ring-2 focus:ring-magenta/20";
const labelClass = "block text-sm font-medium text-ink";

export default function OnboardingForm({
  initial,
  email,
}: {
  initial:
    | Partial<Pick<Database["public"]["Tables"]["profiles"]["Row"], "display_name" | "avatar_url" | "bio">>
    | undefined;
  email: string;
}) {
  const t = useTranslations("Onboarding");
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
      setError(t("notLoggedIn"));
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
        <span className={labelClass}>{t("avatarPreview")}</span>
        <div className="mt-2 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-surface-2 ring-2 ring-sun/40">
          {avatarUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
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
        <span className={labelClass}>{t("pickPreset")}</span>
        <div className="mt-2 grid grid-cols-6 gap-2">
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
      </div>

      <label className={labelClass}>
        {t("pasteAvatarLink")}
        <input
          type="url"
          value={avatarUrl.startsWith("https://api.dicebear.com") ? "" : avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          placeholder={t("avatarPlaceholder")}
          className={inputClass}
        />
      </label>

      <label className={labelClass}>
        {t("displayName")}
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
        {t("bio")} <span className="text-ink-muted">{t("optional")}</span>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          placeholder={t("bioPlaceholder")}
          className={inputClass}
        />
      </label>

      {error && (
        <p className="rounded-xl bg-danger/10 p-3 text-sm text-danger">{error}</p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-xl bg-magenta px-4 py-2.5 font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
      >
        {saving ? t("saving") : t("saveStart")}
      </button>
    </form>
  );
}