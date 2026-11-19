import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale, getTranslations } from "next-intl/server";
import { fetchJoinMePostById } from "@/lib/joinMeQueries";
import JoinMeThread from "@/app/join-me/[id]/JoinMeThread";

export const dynamic = "force-dynamic";

export default async function JoinMeTopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations();
  const locale = await getLocale();
  const supabase = await createClient();

  const { post, replies, schemaMissing } = await fetchJoinMePostById(
    supabase,
    id,
    t("Fallback.pinner"),
  );

  if (schemaMissing) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="deckle-note rounded-xl p-8 text-center">
          <h1 className="font-display text-2xl font-bold text-ink">
            {t("JoinMe.schemaNoticeTitle")}
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            {t("JoinMe.schemaNoticeBody")}
          </p>
        </div>
      </main>
    );
  }

  if (!post) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
      <JoinMeThread
        initialPost={post}
        initialReplies={replies}
        locale={locale}
      />
    </main>
  );
}
