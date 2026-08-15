import { createClient } from "@/lib/supabase/server";
import { getTranslations, getLocale } from "next-intl/server";
import type { MapPin } from "@/lib/pin";
import { summarizePins } from "@/lib/pin";
import HomeMap from "@/app/HomeMap";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pins")
    .select(
      "id, photo_url, lat, lng, city, country, notes, created_at, user_id, title, visited_at, tags, profiles!inner ( display_name, avatar_url )",
    )
    .order("created_at", { ascending: false });

  if (error || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <SetupNotice />
      </main>
    );
  }

  const pins: MapPin[] = (data ?? []).map((p) => {
    const profile = (p as unknown as { profiles: { display_name: string; avatar_url: string } | null }).profiles;
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      {/* Postmark eyebrow */}
      <p className="font-display mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-magenta">
        {t("Landing.eyebrow")}
      </p>

      {/* Bilingual slash headline */}
      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-4xl">
        {t("Landing.heroLine1")}
        <br />
        <span className="text-ink-muted">{t("Landing.heroLine2")}</span>
      </h1>

      <p className="mt-2 max-w-xl text-sm text-ink-muted sm:text-base">
        {t("Landing.subtitle")} 🇹🇭
      </p>

      <div className="mt-6">
        <HomeMap
          pins={pins}
          summary={summarizePins(pins, locale)}
          title={t("Summary.communityMap")}
          locale={locale}
        />
      </div>
    </main>
  );
}

function SetupNotice() {
  return (
    <div className="rounded-2xl border border-dashed border-magenta/40 bg-surface-2 p-8 text-center">
      <div className="text-4xl">🗺️</div>
      <h1 className="font-display mt-3 text-2xl font-bold">Almost there!</h1>
      <p className="mx-auto mt-2 max-w-md text-ink-muted text-sm">
        This map needs a Supabase project to power it. Add your{" "}
        <code className="mx-1 rounded bg-surface px-1.5 py-0.5 text-sm">
          NEXT_PUBLIC_SUPABASE_URL
        </code>
        and{" "}
        <code className="mx-1 rounded bg-surface px-1.5 py-0.5 text-sm">
          NEXT_PUBLIC_SUPABASE_ANON_KEY
        </code>
        to{" "}
        <code className="rounded bg-surface px-1.5 py-0.5 text-sm">
          .env.local
        </code>
        , then run the SQL in{" "}
        <code className="rounded bg-surface px-1.5 py-0.5 text-sm">
          supabase/schema.sql
        </code>
        .
      </p>
    </div>
  );
}