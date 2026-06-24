"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@/features/theme/theme-provider";
import { I18nProvider } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages/types";

type CampusEnergyProvidersProps = {
  children: ReactNode;
  locale: Locale;
  messages: Messages;
};

export function CampusEnergyProviders({
  children,
  locale,
  messages,
}: CampusEnergyProvidersProps) {
  return (
    <I18nProvider locale={locale} messages={messages}>
      <ThemeProvider>{children}</ThemeProvider>
    </I18nProvider>
  );
}
