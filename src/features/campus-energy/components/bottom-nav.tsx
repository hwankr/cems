"use client";

import { Building2, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n/client";

type Mode = "admin" | "participant";

type BottomNavProps = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
};

export function BottomNav({ mode, onModeChange }: BottomNavProps) {
  const { messages } = useI18n();
  const items: { value: Mode; label: string; icon: ReactNode }[] = [
    {
      value: "admin",
      label: messages.modes.admin,
      icon: <Building2 size={20} aria-hidden="true" />,
    },
    {
      value: "participant",
      label: messages.modes.participant,
      icon: <Sparkles size={20} aria-hidden="true" />,
    },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface-2/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto grid max-w-md grid-cols-2">
        {items.map(({ value, label, icon }) => {
          const active = mode === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => onModeChange(value)}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center gap-1 px-2 py-2.5 text-[11px] font-medium transition ${
                active ? "text-accent" : "text-ink-subtle"
              }`}
            >
              <span
                className={`grid h-8 w-16 place-items-center rounded-full transition ${
                  active ? "bg-accent-soft" : ""
                }`}
              >
                {icon}
              </span>
              {label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
