import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoginForm from "@/app/login/LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect(searchParams && (await searchParams).next ? "/" : "/profile");

  return (
    <main className="mx-auto max-w-md px-4 py-14">
      <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="mb-6 text-center">
          <div className="text-4xl">🔐</div>
          <h1 className="mt-2 text-2xl font-semibold">Get into PinSnap</h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            No password needed — get a one-time email link, or sign in with
            Google.
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}