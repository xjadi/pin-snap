import { createClient } from "@/lib/supabase/server";
import type { MapPin } from "@/lib/pin";
import HomeMap from "@/app/HomeMap";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pins")
    .select(
      "id, photo_url, lat, lng, city, country, notes, created_at, user_id, profiles!inner ( display_name, avatar_url )",
    )
    .order("created_at", { ascending: false });

  // If env isn't set yet, surface a friendly placeholder instead of crashing.
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
      owner_display_name: profile?.display_name ?? "Pinner",
      owner_avatar_url: profile?.avatar_url ?? "",
    };
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-5 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Drop a photo. <span className="text-amber-600">Pin the place.</span>
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-stone-500">
          Everyone&apos;s memories, mapped. Hover a pin to peek the photo — click
          it to read the story. Centered on Thailand. 🇹🇭
        </p>
      </div>

      <HomeMap pins={pins} />
    </main>
  );
}

function SetupNotice() {
  return (
    <div className="rounded-3xl border border-dashed border-amber-300 bg-amber-50 p-8 text-center">
      <div className="text-4xl">🗺️</div>
      <h1 className="mt-3 text-2xl font-semibold">Almost there!</h1>
      <p className="mx-auto mt-2 max-w-md text-stone-600">
        This map needs a Supabase project to power it. Add your
        <code className="mx-1 rounded bg-white px-1.5 py-0.5 text-sm">
          NEXT_PUBLIC_SUPABASE_URL
        </code>
        and
        <code className="mx-1 rounded bg-white px-1.5 py-0.5 text-sm">
          NEXT_PUBLIC_SUPABASE_ANON_KEY
        </code>
        to <code className="rounded bg-white px-1.5 py-0.5 text-sm">.env.local</code>,
        then run the SQL in
        <code className="ml-1 rounded bg-white px-1.5 py-0.5 text-sm">
          supabase/schema.sql
        </code>
        .
      </p>
    </div>
  );
}