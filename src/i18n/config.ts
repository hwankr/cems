export const supportedLocales = ["ko", "en"] as const;

export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "ko";

export const localeCookieName = "cems-locale";

export const localeLabels: Record<Locale, string> = {
  en: "English",
  ko: "한국어",
};

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && supportedLocales.includes(value as Locale)
  );
}

export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : defaultLocale;
}
