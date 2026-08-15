import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { ANONYMOUS } from "@/lib/constants";

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-anon-key";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect these path prefixes.
  const protectedPaths = ["/add", "/profile", "/onboarding"];
  const path = request.nextUrl.pathname;
  const isProtected = protectedPaths.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  // Brand new authenticated users must finish onboarding before adding pins.
  if (user && path.startsWith("/add")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .single();

    if (!profile || profile.display_name === ANONYMOUS) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}