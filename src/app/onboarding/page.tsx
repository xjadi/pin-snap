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
      <div className="relative overflow-hidden rounded-xl border-2 border-border bg-surface shadow-[0_14px_34px_rgba(24,16,8,0.14)]">
        <div className="airmail-stripe" />
        <div className="p-7 sm:p-8">
          <div className="mb-6 border-b border-dashed border-border pb-4 text-center">
            <span className="luggage-tag">EX LIBRIS · TRAVELER ID</span>
            <h1 className="font-display mt-3 text-2xl font-bold">{t("title")}</h1>
            <p className="mt-1 text-sm text-ink-muted">{t("subtitle")}</p>
          </div>

          <OnboardingForm initial={profile ?? undefined} email={user.email ?? ""} />
        </div>
      </div>
    </main>
  );
}