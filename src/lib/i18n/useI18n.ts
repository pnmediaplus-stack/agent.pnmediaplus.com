"use client";

import { useContext, useMemo } from "react";
import { defaultLocale, dictionaries, resolveLocale } from "@/lib/i18n/core";
import { I18nContext } from "@/lib/i18n/I18nProvider";
import type { I18nNamespace, Locale } from "@/lib/i18n/types";

function resolveDictionary(locale: Locale) {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}

export function useI18n(namespace?: I18nNamespace) {
  const context = useContext(I18nContext);
  const fallbackLocale = useMemo(() => {
    if (typeof document !== "undefined") {
      return resolveLocale(document.documentElement.lang || navigator.language);
    }
    return defaultLocale;
  }, []);
  const locale = context?.locale ?? fallbackLocale;

  const dictionary = useMemo(() => resolveDictionary(locale), [locale]);

  function t(key: string) {
    const fullKey = namespace && !key.includes(".") ? `${namespace}.${key}` : key;
    return dictionary[fullKey] ?? dictionary[key];
  }

  return { t, locale, setLocale: context?.setLocale ?? (() => undefined) };
}
