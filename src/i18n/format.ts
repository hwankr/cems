import type { Locale } from "./config";

const formatterLocales: Record<Locale, string> = {
  en: "en-US",
  ko: "ko-KR",
};

const numberFormatters = new Map<Locale, Intl.NumberFormat>();

function getNumberFormatter(locale: Locale) {
  const existing = numberFormatters.get(locale);
  if (existing) return existing;

  const formatter = new Intl.NumberFormat(formatterLocales[locale], {
    maximumFractionDigits: 0,
  });
  numberFormatters.set(locale, formatter);
  return formatter;
}

export function formatNumber(locale: Locale, value: number) {
  return getNumberFormatter(locale).format(value);
}

export function formatKwh(locale: Locale, value: number) {
  return `${formatNumber(locale, value)} kWh`;
}

export function formatSignedKwh(locale: Locale, value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatKwh(locale, value)}`;
}

export function formatPoints(locale: Locale, value: number) {
  const suffix = locale === "ko" ? "점" : " pts";
  return `${formatNumber(locale, value)}${suffix}`;
}
