import { ThemeProvider } from "@/components/ui/ThemeProvider";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppFrame } from "@/components/layout/AppFrame";
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
        <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange>
          <I18nProvider initialLocale={defaultLocale}>
          <AppFrame>{children}</AppFrame>
        </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
