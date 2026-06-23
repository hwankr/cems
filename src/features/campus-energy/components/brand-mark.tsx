"use client";

import { Zap } from "lucide-react";
import { useI18n } from "@/i18n/client";

export function BrandMark() {
  const { messages } = useI18n();

  return (
    <span className="inline-flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-saving to-accent text-[#04121d] shadow-[0_0_24px_-6px_rgb(56_189_248_/_0.6)]">
        <Zap size={18} fill="currentColor" aria-hidden="true" />
      </span>
      <span className="hidden text-sm font-black tracking-tight text-ink sm:inline">
        {messages.app.brandName}
      </span>
    </span>
  );
}
