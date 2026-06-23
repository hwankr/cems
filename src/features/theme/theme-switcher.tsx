"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n/client";
import type { ThemeChoice } from "./theme";
import { useTheme } from "./theme-provider";

export function ThemeSwitcher() {
  const { messages } = useI18n();
  const { theme, setTheme } = useTheme();

  const options: { value: ThemeChoice; label: string; icon: ReactNode }[] = [
    {
      value: "light",
      label: messages.app.theme.light,
      icon: <Sun size={15} aria-hidden="true" />,
    },
    {
      value: "dark",
      label: messages.app.theme.dark,
      icon: <Moon size={15} aria-hidden="true" />,
    },
    {
      value: "system",
      label: messages.app.theme.system,
      icon: <Monitor size={15} aria-hidden="true" />,
    },
  ];

  return (
    <div
      role="group"
      aria-label={messages.app.theme.label}
      className="inline-flex items-center rounded-full border border-line bg-inset p-1"
    >
      {options.map(({ value, label, icon }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            title={label}
            aria-label={label}
            aria-pressed={active}
            className={`grid h-7 w-7 place-items-center rounded-full transition ${
              active
                ? "bg-accent text-on-accent"
                : "text-ink-subtle hover:text-ink"
            }`}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}
