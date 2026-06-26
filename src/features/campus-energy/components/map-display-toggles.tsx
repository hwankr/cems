"use client";

import { Flame, Tag } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n/client";

type MapDisplayTogglesProps = {
  showHeat: boolean;
  onToggleHeat: () => void;
  showLabels: boolean;
  onToggleLabels: () => void;
};

// The heatmap/label toggles surfaced inside the settings popover on mobile,
// where they are removed from the always-on map rail to cut clutter.
export function MapDisplayToggles({
  showHeat,
  onToggleHeat,
  showLabels,
  onToggleLabels,
}: MapDisplayTogglesProps) {
  const { messages } = useI18n();
  const controls = messages.mapView.controls;

  return (
    <div className="flex flex-col">
      <ToggleRow label={controls.heatmap} active={showHeat} onClick={onToggleHeat}>
        <Flame size={16} aria-hidden="true" />
      </ToggleRow>
      <ToggleRow
        label={controls.labels}
        active={showLabels}
        onClick={onToggleLabels}
      >
        <Tag size={16} aria-hidden="true" />
      </ToggleRow>
    </div>
  );
}

function ToggleRow({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-xs font-medium text-ink-muted">{label}</span>
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        aria-pressed={active}
        className={`grid h-8 w-8 place-items-center rounded-lg transition ${
          active
            ? "bg-accent-soft text-accent"
            : "bg-surface-3 text-ink-subtle hover:text-ink"
        }`}
      >
        {children}
      </button>
    </div>
  );
}
