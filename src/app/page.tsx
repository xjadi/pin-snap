import { createClient } from "@/lib/supabase/server";
import { getTranslations, getLocale } from "next-intl/server";
import type { MapPin } from "@/lib/pin";
import { summarizePins } from "@/lib/pin";
import { fetchJoinMePosts } from "@/lib/joinMeQueries";
import HomeMap, { type MapLayer } from "@/app/HomeMap";
import GuestJournalHero from "@/components/GuestJournalHero";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ layer?: string }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const rawLayer = sp?.layer;
  const initialLayer: MapLayer =
    rawLayer === "join-me" || rawLayer === "pins" ? rawLayer : "all";

  const t = await getTranslations();
  const locale = await getLocale();
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    { data, error },
    { posts: joinMePosts },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("pins")
      .select(
        "id, photo_url, lat, lng, city, country, notes, created_at, user_id, title, visited_at, tags, profiles!inner ( display_name, avatar_url )",
      )
      .order("created_at", { ascending: false }),
    fetchJoinMePosts(supabase, t("Fallback.pinner")),
  ]);

  if (error || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <SetupNotice />
      </main>
    );
  }

  const pins: MapPin[] = (data ?? []).map((p) => {
    const profile = (
      p as unknown as {
        profiles: { display_name: string; avatar_url: string } | null;
      }
    ).profiles;
    return {
      id: p.id,
      photo_url: p.photo_url,
      lat: p.lat,
      lng: p.lng,
      city: p.city ?? "",
      country: p.country ?? "",
      notes: p.notes ?? "",
      created_at: p.created_at,
      owner_id: p.user_id,
      owner_display_name: profile?.display_name ?? t("Fallback.pinner"),
      owner_avatar_url: profile?.avatar_url ?? "",
      title: p.title,
      visited_at: p.visited_at,
      tags: p.tags,
    };
  });

  const summary = summarizePins(pins, locale);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <GuestJournalHero
        initialIsSignedIn={Boolean(user)}
        pins={pins}
        summary={summary}
      />

      <div id="community-map" className="scroll-mt-20">
        <HomeMap
          pins={pins}
          joinMePosts={joinMePosts}
          initialLayer={initialLayer}
          summary={summary}
          title={t("Summary.communityMap")}
          locale={locale}
        />
      </div>
    </main>
  );
}

function SetupNotice() {
  return (
    <div className="deckle-note relative overflow-hidden rounded-xl p-8 text-center">
      <div className="airmail-stripe absolute inset-x-0 top-0" />
      <div className="mt-2 text-4xl">🗺️</div>
      <h1 className="font-display mt-3 text-2xl font-bold">Almost there!</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
        This map needs a Supabase project to power it. Add your{" "}
        <code className="font-typewriter mx-1 rounded bg-surface px-1.5 py-0.5 text-sm">
          NEXT_PUBLIC_SUPABASE_URL
        </code>
        and{" "}
        <code className="font-typewriter mx-1 rounded bg-surface px-1.5 py-0.5 text-sm">
          NEXT_PUBLIC_SUPABASE_ANON_KEY
        </code>
        to{" "}
        <code className="font-typewriter rounded bg-surface px-1.5 py-0.5 text-sm">
          .env.local
        </code>
        , then run the SQL in{" "}
        <code className="font-typewriter rounded bg-surface px-1.5 py-0.5 text-sm">
          supabase/schema.sql
        </code>
        .
      </p>
    </div>
  );
}