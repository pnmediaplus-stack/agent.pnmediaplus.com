"use client";

import { createContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { defaultLocale, resolveLocale } from "@/lib/i18n/core";
import type { I18nContextValue, Locale } from "@/lib/i18n/types";

const STORAGE_KEY = "pn-os-ai.locale";

export const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLocale(fallback: Locale) {
  if (typeof window === "undefined") {
    return fallback;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "en" || stored === "vi" ? stored : fallback;
}

export function I18nProvider({
  children,
  initialLocale = defaultLocale
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  function setLocale(nextLocale: Locale) {
    setLocaleState(nextLocale);
    document.documentElement.lang = nextLocale;
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
  }

  useEffect(() => {
    const nextLocale = readStoredLocale(resolveLocale(document.documentElement.lang || navigator.language));
    setLocaleState(nextLocale);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(STORAGE_KEY, locale);
  }, [locale]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && (event.newValue === "en" || event.newValue === "vi")) {
        setLocaleState(event.newValue);
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
