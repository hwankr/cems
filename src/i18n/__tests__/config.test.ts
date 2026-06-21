import { describe, expect, it } from "vitest";
import {
  defaultLocale,
  isLocale,
  localeCookieName,
  normalizeLocale,
  supportedLocales,
} from "../config";

describe("i18n config", () => {
  it("uses Korean as the default locale", () => {
    expect(defaultLocale).toBe("ko");
    expect(supportedLocales).toEqual(["ko", "en"]);
  });

  it("recognizes only supported locales", () => {
    expect(isLocale("ko")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("ja")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });

  it("normalizes unsupported values to Korean", () => {
    expect(normalizeLocale("en")).toBe("en");
    expect(normalizeLocale("fr")).toBe("ko");
    expect(normalizeLocale(null)).toBe("ko");
  });

  it("uses a stable cookie name for future settings", () => {
    expect(localeCookieName).toBe("cems-locale");
  });
});
