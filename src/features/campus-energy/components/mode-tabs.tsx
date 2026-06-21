"use client";

import { useI18n } from "@/i18n/client";

type Mode = "admin" | "participant";

type ModeTabsProps = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
};

export function ModeTabs({ mode, onModeChange }: ModeTabsProps) {
  const { messages } = useI18n();
  const tabs: { label: string; value: Mode }[] = [
    { label: messages.modes.admin, value: "admin" },
    { label: messages.modes.participant, value: "participant" },
  ];

  return (
    <div className="inline-flex border border-slate-300 bg-white p-1">
      {tabs.map(({ value, label }) => (
        <button
          key={value}
          type="button"
          onClick={() => onModeChange(value)}
          className={`px-3 py-2 text-sm font-medium ${
            mode === value
              ? "bg-slate-950 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
