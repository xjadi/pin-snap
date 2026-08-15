import type { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { LOCALE_COOKIE, defaultLocale, type Locale } from "@/i18n/constants";

function detectLocale(request: NextRequest): Locale {
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookie === "th" || cookie === "en") return cookie;
  const accept = request.headers.get("accept-language") ?? "";
  if (accept.includes("th")) return "th";
  return defaultLocale;
}

function setLocaleCookie(
  request: NextRequest,
  response: NextResponse,
  locale: Locale,
): NextResponse {
  // Only set if not already correct (avoids unnecessary rewrite of Set-Cookie).
  const existing = request.cookies.get(LOCALE_COOKIE)?.value;
  if (existing === locale) return response;
  response.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}

export async function proxy(request: NextRequest) {
  const locale = detectLocale(request);
  const response = await updateSession(request);
  return setLocaleCookie(request, response, locale);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};