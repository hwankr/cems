"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  localeCookieName,
  supportedLocales,
  type Locale,
} from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { getLocalizedPath } from "@/i18n/routes";

const cookieMaxAgeSeconds = 60 * 60 * 24 * 365;

export function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const { locale, messages } = useI18n();

  function changeLocale(nextLocale: Locale) {
    document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=${cookieMaxAgeSeconds}; samesite=lax`;
    router.push(getLocalizedPath(pathname, nextLocale));
  }

  return (
    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
      <span>{messages.app.language.label}</span>
      <select
        aria-label={messages.app.language.label}
        value={locale}
        onChange={(event) => changeLocale(event.target.value as Locale)}
        className="border border-slate-300 bg-white px-2 py-2 text-sm text-slate-950"
      >
        {supportedLocales.map((option) => (
          <option key={option} value={option}>
            {messages.app.language.options[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
