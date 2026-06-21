import "server-only";

import type { Locale } from "./config";
import type { Messages } from "./messages/types";

const dictionaries = {
  en: () => import("./messages/en").then((module) => module.enMessages),
  ko: () => import("./messages/ko").then((module) => module.koMessages),
} satisfies Record<Locale, () => Promise<Messages>>;

export async function getMessages(locale: Locale) {
  return dictionaries[locale]();
}
