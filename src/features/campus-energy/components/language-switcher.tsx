"use client";

import { Languages } from "lucide-react";
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
    <label className="inline-flex items-center gap-1.5 rounded-full border border-line bg-inset px-2.5 py-1.5 text-xs font-medium text-ink-muted">
      <Languages size={15} aria-hidden="true" className="text-ink-subtle" />
      <span className="sr-only">{messages.app.language.label}</span>
      <select
        aria-label={messages.app.language.label}
        value={locale}
        onChange={(event) => changeLocale(event.target.value as Locale)}
        className="cursor-pointer bg-transparent pr-1 text-ink outline-none"
      >
        {supportedLocales.map((option) => (
          <option key={option} value={option} className="bg-surface text-ink">
            {messages.app.language.options[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
