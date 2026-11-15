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
      <div className="relative overflow-hidden rounded-xl border-2 border-border bg-surface shadow-[0_14px_34px_rgba(24,16,8,0.14)]">
        <div className="airmail-stripe" />
        <div className="p-7 sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-3 border-b border-dashed border-border pb-4">
            <div>
              <span className="luggage-tag mb-2">AIRMAIL DISPATCH</span>
              <h1 className="font-display mt-2 text-2xl font-bold tracking-tight">
                {t("title")}
              </h1>
              <p className="mt-1 text-sm text-ink-muted">{t("subtitle")}</p>
            </div>
            <div
              aria-hidden
              className="font-typewriter shrink-0 -rotate-6 rounded border-2 border-double border-magenta/80 px-2.5 py-1.5 text-center text-[10px] font-bold uppercase leading-tight tracking-widest text-magenta"
            >
              PAR AVION
              <br />
              PINSNAP
            </div>
          </div>
          <LoginForm />
        </div>
        <div className="airmail-stripe" />
      </div>
    </main>
  );
}