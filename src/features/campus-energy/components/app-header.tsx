"use client";

import { ThemeSwitcher } from "@/features/theme/theme-switcher";
import { useI18n } from "@/i18n/client";
import { BrandMark } from "./brand-mark";
import { LanguageSwitcher } from "./language-switcher";
import { ModeTabs } from "./mode-tabs";

type Mode = "admin" | "participant";

type AppHeaderProps = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
  schoolName: string;
};

export function AppHeader({ mode, onModeChange, schoolName }: AppHeaderProps) {
  const { messages } = useI18n();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface-2/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <BrandMark />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink sm:text-base">
              {schoolName}
            </p>
            <p className="hidden truncate text-xs text-ink-subtle sm:block">
              {messages.app.eyebrow}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden lg:block">
            <ModeTabs mode={mode} onModeChange={onModeChange} />
          </div>
          <ThemeSwitcher />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
