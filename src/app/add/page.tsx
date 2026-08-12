import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AddPinMap from "@/app/add/AddPinMap";

export default async function AddPinPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/add");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  const pins = await supabase
    .from("pins")
    .select(
      "id, photo_url, lat, lng, city, country, notes, created_at, user_id, title, visited_at, tags, profiles!inner ( display_name, avatar_url )",
    )
    .order("created_at", { ascending: false });

  type RawPin = NonNullable<typeof pins.data>[number];
  const existingPins = (pins.data ?? []).map((p) => {
    const r = p as RawPin;
    const prof = r.profiles as unknown as { display_name: string; avatar_url: string };
    return {
      id: r.id,
      photo_url: r.photo_url,
      lat: r.lat,
      lng: r.lng,
      city: r.city,
      country: r.country,
      notes: r.notes,
      created_at: r.created_at,
      owner_id: r.user_id,
      owner_display_name: prof?.display_name ?? profile?.display_name ?? "Pinner",
      owner_avatar_url: prof?.avatar_url ?? profile?.avatar_url ?? "",
      title: r.title,
      visited_at: r.visited_at,
      tags: r.tags,
    };
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Add a pin</h1>
        <p className="text-sm text-stone-500">
          Click anywhere on the map, paste a photo link, add a memo, and save.
        </p>
      </div>
      <AddPinMap existingPins={existingPins} />
    </main>
  );
}