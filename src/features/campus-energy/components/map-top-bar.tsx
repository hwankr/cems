"use client";

import { ChevronDown, MapPin, Search, Zap } from "lucide-react";
import { useI18n } from "@/i18n/client";

type MapTopBarProps = {
  query: string;
  onQueryChange: (query: string) => void;
  schoolName: string;
};

export function MapTopBar({ query, onQueryChange, schoolName }: MapTopBarProps) {
  const { messages } = useI18n();
  const mapView = messages.mapView;

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface/95 px-3 py-2 shadow-pop backdrop-blur">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-on-accent">
          <Zap size={15} fill="currentColor" aria-hidden="true" />
        </span>
        <span className="leading-tight">
          <span className="block text-[13px] font-bold text-ink">
            {mapView.brandTitle}
          </span>
          <span className="block text-[11px] text-ink-subtle">
            {mapView.brandSubtitle}
          </span>
        </span>
      </div>

      <label className="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface/95 px-3 shadow-pop backdrop-blur">
        <Search size={16} className="text-ink-subtle" aria-hidden="true" />
        <span className="sr-only">{mapView.searchPlaceholder}</span>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={mapView.searchPlaceholder}
          className="w-28 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-subtle sm:w-32"
        />
      </label>

      <div className="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface/95 px-3 shadow-pop backdrop-blur">
        <MapPin size={15} className="text-accent" aria-hidden="true" />
        <span className="sr-only">{mapView.campusSelectLabel}</span>
        <select
          aria-label={mapView.campusSelectLabel}
          className="cursor-pointer appearance-none bg-transparent pr-1 text-[13px] font-semibold text-ink outline-none"
        >
          <option className="bg-surface text-ink">{schoolName}</option>
        </select>
        <ChevronDown size={14} className="text-ink-subtle" aria-hidden="true" />
      </div>
    </div>
  );
}
