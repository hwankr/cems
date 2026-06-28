"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { ThemeSwitcher } from "@/features/theme/theme-switcher";
import { useI18n } from "@/i18n/client";
import { LanguageSwitcher } from "./language-switcher";
import { MapDisplayToggles } from "./map-display-toggles";

type MapSettingsPopoverProps = {
  open: boolean;
  onClose: () => void;
  showLabels: boolean;
  onToggleLabels: () => void;
};

export function MapSettingsPopover({
  open,
  onClose,
  showLabels,
  onToggleLabels,
}: MapSettingsPopoverProps) {
  const { messages } = useI18n();
  const settings = messages.mapView.settings;

  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label={messages.mapView.popup.close}
        onClick={onClose}
        className="absolute inset-0 z-[60] cursor-default bg-canvas/40 backdrop-blur-[1px]"
      />
      <div
        role="dialog"
        aria-label={settings.title}
        className="absolute left-1/2 top-1/2 z-[61] w-72 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-surface p-4 shadow-pop"
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold text-ink">{settings.title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label={messages.mapView.popup.close}
            className="grid h-7 w-7 place-items-center rounded-lg bg-surface-3 text-ink-subtle transition hover:text-ink"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
        <div className="sm:hidden">
          <MapDisplayToggles
            showLabels={showLabels}
            onToggleLabels={onToggleLabels}
          />
          <div className="my-1 h-px bg-line" aria-hidden="true" />
        </div>
        <Row label={settings.theme}>
          <ThemeSwitcher />
        </Row>
        <Row label={settings.language}>
          <LanguageSwitcher />
        </Row>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs font-medium text-ink-muted">{label}</span>
      {children}
    </div>
  );
}
