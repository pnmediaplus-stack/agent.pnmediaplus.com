import { en } from "@/lib/i18n/en";
import { vi } from "@/lib/i18n/vi";
import type { Locale, TranslationDictionary } from "@/lib/i18n/types";

export const dictionaries: Record<Locale, TranslationDictionary> = { en, vi };
export const defaultLocale: Locale = "en";

export function resolveLocale(input?: string | null): Locale {
  return input?.toLowerCase().startsWith("vi") ? "vi" : "en";
}
