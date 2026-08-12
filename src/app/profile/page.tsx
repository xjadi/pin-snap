import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { MapPin } from "@/lib/pin";
import UserMap from "@/app/users/UserMap";
import ProfileEditor from "@/app/profile/ProfileEditor";
import SummaryPanel from "@/components/SummaryPanel";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
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
      "id, photo_url, lat, lng, city, country, notes, created_at, user_id, profiles!inner ( display_name, avatar_url )",
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
      owner_display_name: prof?.display_name ?? profile?.display_name ?? "Pinner",
      owner_avatar_url: prof?.avatar_url ?? profile?.avatar_url ?? "",
    };
  });

  const needsOnboarding = !profile || profile.display_name === "Anonymous";

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      {needsOnboarding && (
        <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Heads up — pick a display name and avatar in the editor below so your pins
          are recognisable.
        </div>
      )}

      <ProfileEditor initial={profile ?? undefined} email={user.email ?? ""} />

      <div className="mt-12">
        <h2 className="mb-4 text-xl font-bold tracking-tight">Your pins</h2>
        {pins.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-12 text-center text-stone-500 dark:border-stone-700 dark:bg-stone-900">
            <div className="text-4xl">🗺️</div>
            <p className="mt-3">You haven&apos;t pinned anything yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <SummaryPanel pins={pins} />
            <UserMap pins={pins} />
          </div>
        )}
      </div>
    </main>
  );
}