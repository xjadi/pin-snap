import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OnboardingForm from "@/app/onboarding/OnboardingForm";

export default async function OnboardingPage() {
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
      <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="mb-6 text-center">
          <div className="text-4xl">✨</div>
          <h1 className="mt-2 text-2xl font-semibold">Set up your profile</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Pick a display name and avatar so others can recognise your pins.
          </p>
        </div>

        <OnboardingForm initial={profile ?? undefined} email={user.email ?? ""} />
      </div>
    </main>
  );
}