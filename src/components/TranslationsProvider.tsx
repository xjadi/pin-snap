"use client";

import { NextIntlClientProvider } from "next-intl";

type Props = React.ComponentProps<typeof NextIntlClientProvider>;

export function TranslationsProvider({ children, ...props }: Props) {
  return (
    <NextIntlClientProvider {...props}>{children}</NextIntlClientProvider>
  );
}