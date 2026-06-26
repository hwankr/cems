"use client";

import { Flame, Minus, Plus, RotateCcw, Settings, Tag } from "lucide-react";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n/client";

type MapControlsProps = {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  showHeat: boolean;
  onToggleHeat: () => void;
  showLabels: boolean;
  onToggleLabels: () => void;
  onOpenSettings: () => void;
};

export function MapControls({
  onZoomIn,
  onZoomOut,
  onResetView,
  showHeat,
  onToggleHeat,
  showLabels,
  onToggleLabels,
  onOpenSettings,
}: MapControlsProps) {
  const { messages } = useI18n();
  const controls = messages.mapView.controls;

  return (
    <div className="flex flex-col items-end gap-2.5">
      <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface/95 shadow-pop backdrop-blur">
        <ControlButton label={controls.zoomIn} onClick={onZoomIn}>
          <Plus size={18} aria-hidden="true" />
        </ControlButton>
        <span className="h-px bg-line" aria-hidden="true" />
        <ControlButton label={controls.resetView} onClick={onResetView}>
          <RotateCcw size={17} aria-hidden="true" />
        </ControlButton>
        <span className="h-px bg-line" aria-hidden="true" />
        <ControlButton label={controls.zoomOut} onClick={onZoomOut}>
          <Minus size={18} aria-hidden="true" />
        </ControlButton>
      </div>

      <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-surface/95 shadow-pop backdrop-blur">
        <div className="hidden flex-col sm:flex">
          <ControlButton
            label={controls.heatmap}
            active={showHeat}
            onClick={onToggleHeat}
          >
            <Flame size={18} aria-hidden="true" />
          </ControlButton>
          <span className="h-px bg-line" aria-hidden="true" />
          <ControlButton
            label={controls.labels}
            active={showLabels}
            onClick={onToggleLabels}
          >
            <Tag size={18} aria-hidden="true" />
          </ControlButton>
          <span className="h-px bg-line" aria-hidden="true" />
        </div>
        <ControlButton label={controls.settings} onClick={onOpenSettings}>
          <Settings size={18} aria-hidden="true" />
        </ControlButton>
      </div>
    </div>
  );
}

function ControlButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`grid h-[42px] w-[42px] place-items-center transition ${
        active ? "bg-accent-soft text-accent" : "text-ink-muted hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
