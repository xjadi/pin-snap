import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "@/app/login/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const t = await getTranslations("Auth");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect(searchParams && (await searchParams).next ? "/" : "/profile");

  return (
    <main className="mx-auto max-w-md px-4 py-14">
      <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="text-4xl">🔐</div>
          <h1 className="font-display mt-2 text-2xl font-bold">{t("title")}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t("subtitle")}</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}