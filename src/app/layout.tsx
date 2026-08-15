import type { Metadata } from "next";
import { Kanit, IBM_Plex_Sans_Thai, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { Navbar } from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TranslationsProvider } from "@/components/TranslationsProvider";
import { getLocale, getMessages, getTranslations } from "next-intl/server";

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plexThai = IBM_Plex_Sans_Thai({
  variable: "--font-plex-thai",
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Brand");
  return {
    title: `${t("name")} — ${t("tagline")}`,
    description: t("tagline"),
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${kanit.variable} ${plexThai.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-paper text-ink">
        <ThemeProvider>
          <TranslationsProvider locale={locale} messages={messages}>
            <AuthProvider>
              <Navbar />
              {children}
            </AuthProvider>
          </TranslationsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}