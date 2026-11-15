"use client";

import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const t = useTranslations("Nav");
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className="font-typewriter rounded-md border border-transparent px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted transition hover:border-border hover:bg-surface-2 hover:text-ink"
    >
      {t("signOut")}
    </button>
  );
}