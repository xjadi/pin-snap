import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ANONYMOUS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const t = await getTranslations("People");
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
      <div className="mb-8 text-center">
        <span className="luggage-tag mb-2">TRAVELER DIRECTORY</span>
        <h1 className="font-display mt-2 text-3xl font-bold tracking-tight">
          {t("title")}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{t("subtitle")}</p>
      </div>

      {(!profiles ||
        profiles.filter((p) => p.display_name && p.display_name !== ANONYMOUS)
          .length === 0) && (
        <p className="font-typewriter text-center text-sm text-ink-muted">
          {t("empty")}
        </p>
      )}

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {(profiles ?? [])
          .filter((p) => p.display_name && p.display_name !== ANONYMOUS)
          .map((p, i) => {
            const tilt = i % 2 === 0 ? "-1deg" : "1deg";
            const tapeTilt = i % 2 === 0 ? "-rotate-2" : "rotate-2";
            return (
              <Link
                key={p.id}
                href={`/users/${p.id}`}
                style={{ transform: `rotate(${tilt})` }}
                className="polaroid group relative mt-2 flex flex-col items-center p-5 text-center"
              >
                <div
                  aria-hidden
                  className={`scotch-tape absolute -top-3 left-1/2 z-10 h-5 w-16 -translate-x-1/2 ${tapeTilt}`}
                />
                <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-surface-2 ring-2 ring-sun/40 transition group-hover:ring-sun">
                  {p.avatar_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={p.avatar_url}
                      alt={p.display_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl">🙂</span>
                  )}
                </span>
                <p className="font-display mt-3 truncate font-bold text-ink">
                  {p.display_name}
                </p>
                <span className="luggage-tag mt-2">
                  {t("count", { count: tally.get(p.id) ?? 0 })}
                </span>
                {p.bio && (
                  <p className="font-typewriter mt-2.5 line-clamp-2 text-xs text-ink-muted">
                    {p.bio}
                  </p>
                )}
              </Link>
            );
          })}
      </div>
    </main>
  );
}