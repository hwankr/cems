"use client";

import { Building2, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n/client";

type Mode = "admin" | "participant";

type ModeTabsProps = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
};

export function ModeTabs({ mode, onModeChange }: ModeTabsProps) {
  const { messages } = useI18n();
  const tabs: { label: string; value: Mode; icon: ReactNode }[] = [
    {
      label: messages.modes.admin,
      value: "admin",
      icon: <Building2 size={15} aria-hidden="true" />,
    },
    {
      label: messages.modes.participant,
      value: "participant",
      icon: <Sparkles size={15} aria-hidden="true" />,
    },
  ];

  return (
    <div className="inline-flex rounded-full border border-line bg-inset p-1">
      {tabs.map(({ value, label, icon }) => {
        const active = mode === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onModeChange(value)}
            aria-pressed={active}
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-accent text-[#04121d] shadow-sm"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {icon}
            {label}
          </button>
        );
      })}
    </div>
  );
}
