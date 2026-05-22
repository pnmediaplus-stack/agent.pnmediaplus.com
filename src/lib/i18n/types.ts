export type Locale = "en" | "vi";

export type TranslationDictionary = Record<string, string>;

export type I18nNamespace = string;

export type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};
