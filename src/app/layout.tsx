import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { defaultLocale, dictionaries } from "@/lib/i18n";
import { I18nProvider } from "@/lib/i18n/I18nProvider";

const meta = dictionaries[defaultLocale];

export const metadata: Metadata = {
  title: meta["shared.meta.title"],
  description: meta["shared.meta.description"]
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang={defaultLocale} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <I18nProvider initialLocale={defaultLocale}>
          <AppShell>{children}</AppShell>
        </I18nProvider>
      </body>
    </html>
  );
}
