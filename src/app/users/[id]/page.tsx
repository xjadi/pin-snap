import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getTranslations, getLocale } from "next-intl/server";
import { summarizePins, type MapPin } from "@/lib/pin";
import UserMap from "@/app/users/UserMap";

export const dynamic = "force-dynamic";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations();
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, bio, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!profile) notFound();

  const { data: rawPins } = await supabase
    .from("pins")
    .select(
      "id, photo_url, lat, lng, city, country, notes, created_at, user_id, title, visited_at, tags, profiles!inner ( display_name, avatar_url )",
    )
    .eq("user_id", id)
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
      owner_display_name: prof?.display_name ?? profile.display_name,
      owner_avatar_url: prof?.avatar_url ?? profile.avatar_url,
      title: p.title,
      visited_at: p.visited_at,
      tags: p.tags,
    };
  });

  const summary = summarizePins(pins, locale);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="relative mb-8 overflow-hidden rounded-xl border-2 border-border bg-surface shadow-sm">
        <div className="airmail-stripe" />
        <div className="flex flex-col items-center gap-5 p-6 text-center sm:flex-row sm:text-left">
          <div className="polaroid relative shrink-0 -rotate-2 p-1.5">
            <div
              aria-hidden
              className="scotch-tape absolute -top-2.5 left-1/2 z-10 h-4 w-12 -translate-x-1/2 rotate-2"
            />
            <span className="flex h-20 w-20 items-center justify-center overflow-hidden bg-surface-2">
              {profile.avatar_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={profile.avatar_url}
                  alt={profile.display_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-3xl">🙂</span>
              )}
            </span>
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="luggage-tag">
                {t("People.count", { count: pins.length })}
              </span>
              <span className="rubber-stamp text-[10px] text-magenta">
                TRAVELER LOG
              </span>
            </div>
            <h1 className="font-display mt-2 text-2xl font-bold tracking-tight">
              {profile.display_name}
            </h1>
            {profile.bio && (
              <p className="journal-lined mt-2 max-w-xl rounded border border-border px-3 py-1 text-sm text-ink-muted">
                {profile.bio}
              </p>
            )}
          </div>

          <Link
            href="/users"
            className="font-typewriter rounded-md border border-border bg-surface-2/60 px-4 py-2 text-xs font-bold uppercase tracking-wider text-ink-muted transition hover:border-ink hover:text-ink"
          >
            {t("People.allPeople")}
          </Link>
        </div>
      </div>

      {pins.length === 0 ? (
        <div className="deckle-note rounded-lg p-12 text-center text-ink-muted">
          <div className="text-4xl">🗂️</div>
          <p className="font-typewriter mt-3 text-sm">
            {t("People.noPins", { name: profile.display_name })}
          </p>
        </div>
      ) : (
        <UserMap
          pins={pins}
          summary={summary}
          title={`${profile.display_name} — ${t("Summary.yourMap")}`}
          locale={locale}
        />
      )}
    </main>
  );
}