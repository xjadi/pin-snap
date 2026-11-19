import { createClient } from "@/lib/supabase/server";
import { getLocale, getTranslations } from "next-intl/server";
import { fetchJoinMePosts } from "@/lib/joinMeQueries";
import JoinMeBoard from "@/app/join-me/JoinMeBoard";

export const dynamic = "force-dynamic";

export default async function JoinMePage({
  searchParams,
}: {
  searchParams?: Promise<{ compose?: string }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const initialCompose = sp?.compose === "1";

  const t = await getTranslations();
  const locale = await getLocale();
  const supabase = await createClient();

  const { posts, schemaMissing } = await fetchJoinMePosts(
    supabase,
    t("Fallback.pinner"),
  );

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      {schemaMissing ? (
        <div className="deckle-note relative overflow-hidden rounded-xl p-8 text-center">
          <div className="airmail-stripe absolute inset-x-0 top-0" />
          <div className="mt-2 text-4xl">📋</div>
          <h1 className="font-display mt-3 text-2xl font-bold text-ink">
            {t("JoinMe.schemaNoticeTitle")}
          </h1>
          <p className="mx-auto mt-2 max-w-lg text-sm text-ink-muted">
            {t("JoinMe.schemaNoticeBody")}
          </p>
        </div>
      ) : (
        <JoinMeBoard
          initialPosts={posts}
          locale={locale}
          initialCompose={initialCompose}
        />
      )}
    </main>
  );
}
