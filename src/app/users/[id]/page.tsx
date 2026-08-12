import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { MapPin } from "@/lib/pin";
import UserMap from "@/app/users/UserMap";

export const dynamic = "force-dynamic";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col items-center gap-4 rounded-3xl border border-stone-200 bg-white p-6 text-center shadow-sm sm:flex-row sm:text-left">
        <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-stone-100 ring-2 ring-amber-200">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={profile.display_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-3xl">🙂</span>
          )}
        </span>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {profile.display_name}
          </h1>
          <p className="text-sm text-amber-600">
            {pins.length} pinned memor{pins.length === 1 ? "y" : "ies"}
          </p>
          {profile.bio && (
            <p className="mt-2 max-w-xl text-sm text-stone-600">{profile.bio}</p>
          )}
        </div>
        <Link
          href="/users"
          className="rounded-full border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-100"
        >
          ← All people
        </Link>
      </div>

      {pins.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-12 text-center text-stone-500">
          <div className="text-4xl">🗂️</div>
          <p className="mt-3">No pins yet from {profile.display_name}.</p>
        </div>
      ) : (
        <UserMap pins={pins} />
      )}
    </main>
  );
}