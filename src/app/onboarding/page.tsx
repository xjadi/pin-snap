import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "@/app/onboarding/OnboardingForm";

export default async function OnboardingPage() {
  const t = await getTranslations("Onboarding");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/onboarding");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, bio")
    .eq("id", user.id)
    .single();

  return (
    <main className="mx-auto max-w-xl px-4 py-12">
      <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="text-4xl">✨</div>
          <h1 className="font-display mt-2 text-2xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t("subtitle")}</p>
        </div>

        <OnboardingForm initial={profile ?? undefined} email={user.email ?? ""} />
      </div>
    </main>
  );
}