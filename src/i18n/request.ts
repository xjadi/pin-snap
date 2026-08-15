import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, defaultLocale, type Locale } from "./constants";

export { LOCALE_COOKIE, defaultLocale, locales, type Locale } from "./constants";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const raw = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale: Locale =
    raw === "th" || raw === "en" ? raw : defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});