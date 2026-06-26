"use client";

import { Building2, Flame, Settings, Tag, User } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useI18n } from "@/i18n/client";

type MapControlsProps = {
  onGoToMyOrg?: () => void;
  profileHref: string;
  showHeat: boolean;
  onToggleHeat: () => void;
  showLabels: boolean;
  onToggleLabels: () => void;
  onOpenSettings: () => void;
};

export function MapControls({
  onGoToMyOrg,
  profileHref,
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
        {onGoToMyOrg ? (
          <>
            <ControlButton label={controls.myOrg} onClick={onGoToMyOrg}>
              <Building2 size={18} aria-hidden="true" />
            </ControlButton>
            <span className="h-px bg-line" aria-hidden="true" />
          </>
        ) : null}
        <ControlLink label={controls.profile} href={profileHref}>
          <User size={18} aria-hidden="true" />
        </ControlLink>
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

function ControlLink({
  label,
  href,
  children,
}: {
  label: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className="grid h-[42px] w-[42px] place-items-center text-ink-muted transition hover:text-ink"
    >
      {children}
    </Link>
  );
}
