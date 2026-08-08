import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, bio, created_at")
    .order("created_at", { ascending: false });

  const { data: counts } = await supabase
    .from("pins")
    .select("user_id");

  // Tally pins per user in JS.
  const tally = new Map<string, number>();
  (counts ?? []).forEach((row) => {
    const uid = row.user_id as unknown as string;
    tally.set(uid, (tally.get(uid) ?? 0) + 1);
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight">The pinner crew</h1>
        <p className="mt-1 text-stone-500">
          Everyone sharing memories on the map. Tap a profile to see their pins.
        </p>
      </div>

      {(!profiles || profiles.length === 0) && (
        <p className="text-center text-stone-500">No pinners yet. Be the first!</p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {(profiles ?? [])
          .filter((p) => p.display_name && p.display_name !== "Anonymous")
          .map((p) => (
            <Link
              key={p.id}
              href={`/users/${p.id}`}
              className="group flex flex-col items-center rounded-3xl border border-stone-200 bg-white p-5 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-stone-100 ring-2 ring-amber-200 transition group-hover:ring-amber-400">
                {p.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.avatar_url}
                    alt={p.display_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl">🙂</span>
                )}
              </span>
              <p className="mt-3 truncate font-semibold text-stone-800">
                {p.display_name}
              </p>
              <p className="text-xs font-medium text-amber-600">
                {tally.get(p.id) ?? 0} pinned memor{tally.get(p.id) === 1 ? "y" : "ies"}
              </p>
              {p.bio && (
                <p className="mt-1 line-clamp-2 text-xs text-stone-400">{p.bio}</p>
              )}
            </Link>
          ))}
      </div>
    </main>
  );
}