import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTranslations, getLocale } from "next-intl/server";
import type { MapPin } from "@/lib/pin";
import { ANONYMOUS } from "@/lib/constants";
import { summarizePins } from "@/lib/pin";
import UserMap from "@/app/users/UserMap";
import ProfileEditor from "@/app/profile/ProfileEditor";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/profile");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, bio, created_at")
    .eq("id", user.id)
    .single();

  const { data: rawPins } = await supabase
    .from("pins")
    .select(
      "id, photo_url, lat, lng, city, country, notes, created_at, user_id, title, visited_at, tags, profiles!inner ( display_name, avatar_url )",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const pins: MapPin[] = (rawPins ?? []).map((p) => {
    const prof = (p as unknown as {
      profiles: { display_name: string; avatar_url: string } | null;
    }).profiles;
    return {
      id: p.id,
      photo_url: p.photo_url,
      lat: p.lat,
      lng: p.lng,
      city: p.city,
      country: p.country,
      notes: p.notes,
      created_at: p.created_at,
      owner_id: p.user_id,
      owner_display_name: prof?.display_name ?? profile?.display_name ?? t("Fallback.pinner"),
      owner_avatar_url: prof?.avatar_url ?? profile?.avatar_url ?? "",
      title: p.title,
      visited_at: p.visited_at,
      tags: p.tags,
    };
  });

  const needsOnboarding = !profile || profile.display_name === ANONYMOUS;
  const summary = summarizePins(pins, locale);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {needsOnboarding && (
        <div className="mb-6 rounded-xl border border-sun/40 bg-sun/10 p-4 text-sm text-ink-muted">
          {t("Profile.banner")}
        </div>
      )}

      <ProfileEditor initial={profile ?? undefined} email={user.email ?? ""} />

      <div className="mt-12">
        <h2 className="font-display mb-4 text-xl font-bold tracking-tight">
          {t("Profile.title")}
        </h2>
        {pins.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center text-ink-muted">
            <div className="text-4xl">🗺️</div>
            <p className="mt-3">{t("Profile.emptyState")}</p>
          </div>
        ) : (
          <UserMap
            pins={pins}
            summary={summary}
            title={t("Summary.yourMap")}
            locale={locale}
          />
        )}
      </div>
    </main>
  );
}