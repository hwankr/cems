"use client";

import Link from "next/link";
import { ArrowRight, Minus, TrendingDown, TrendingUp, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";
import { formatNumber } from "@/i18n/format";
import { interpolate } from "@/i18n/interpolate";
import type { BuildingDetail } from "../domain/building-detail";
import type { EnergyComparison, EnergySubject } from "../domain/types";
import { STATUS_COLOR } from "./status-color";

const HOUR_TICKS = [0, 6, 12, 18, 24];

type BuildingPopupProps = {
  subject: EnergySubject;
  comparison?: EnergyComparison;
  detail: BuildingDetail;
  campusName: string;
  onClose: () => void;
};

export function BuildingPopup({
  subject,
  comparison,
  detail,
  campusName,
  onClose,
}: BuildingPopupProps) {
  const { locale, messages } = useI18n();
  const popup = messages.mapView.popup;
  const [nowHour, setNowHour] = useState(() => new Date().getHours());

  useEffect(() => {
    const timer = setInterval(() => setNowHour(new Date().getHours()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const status = comparison?.status ?? "neutral";
  const { base: color, soft, bar } = STATUS_COLOR[status];
  const actual = comparison?.actualKwh ?? 0;
  const forecast = comparison?.forecastKwh ?? 0;
  const delta = comparison?.deltaKwh ?? 0;
  const positive = delta < 0; // actual below forecast = saving
  const ratePct = forecast > 0 ? Math.abs(delta / forecast) * 100 : 0;
  const deltaSign = delta > 0 ? "+" : delta < 0 ? "−" : "";
  const deltaText = `${deltaSign}${formatNumber(locale, Math.abs(delta))}`;
  const estateHref = `/${locale}/subjects/${encodeURIComponent(
    subject.id,
  )}/estate`;
  const rateText =
    status === "neutral"
      ? messages.status.neutral
      : `${positive ? messages.status.saving : messages.status.overuse} ${ratePct.toFixed(1)}%`;
  const TrendIcon = status === "neutral" ? Minus : positive ? TrendingDown : TrendingUp;

  return (
    <div className="pointer-events-auto overflow-hidden rounded-2xl border border-line bg-surface shadow-pop animate-[cems-pop_0.22s_cubic-bezier(0.2,0.7,0.3,1)_both]">
      <div className="h-1" style={{ background: color }} aria-hidden="true" />
      <div className="flex items-start justify-between gap-2.5 px-4 pt-3.5">
        <div className="min-w-0">
          <div className="truncate text-base font-bold tracking-tight text-ink">
            {subject.name}
          </div>
          <div className="mt-0.5 truncate text-xs text-ink-subtle">
            {campusName} · {subject.shortName}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={popup.close}
          className="grid h-7 w-7 flex-none place-items-center rounded-lg bg-surface-3 text-ink-subtle transition hover:text-ink"
        >
          <X size={15} aria-hidden="true" />
        </button>
      </div>

      <div className="px-4 pb-4 pt-3">
        <div className="mb-3.5 flex items-end justify-between gap-3">
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
              {popup.realtimeUsage}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[28px] font-extrabold leading-none tracking-tight text-ink tabular-nums">
                {formatNumber(locale, actual)}
              </span>
              <span className="text-[13px] font-semibold text-ink-subtle">kWh</span>
            </div>
          </div>
          <span
            className="inline-flex flex-none items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-bold"
            style={{ background: soft, color }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: color }}
              aria-hidden="true"
            />
            {messages.status[status]}
          </span>
        </div>

        <div
          className="mb-3.5 flex items-center gap-2 rounded-[10px] px-3 py-2.5"
          style={{ background: soft }}
        >
          <TrendIcon size={16} style={{ color }} aria-hidden="true" />
          <span className="text-[13px] text-ink-muted">{popup.vsForecast}</span>
          <span className="text-[13px] font-bold tabular-nums" style={{ color }}>
            {deltaText} kWh
          </span>
          <span className="ml-auto text-[13px] font-bold" style={{ color }}>
            {rateText}
          </span>
        </div>

        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] font-semibold tracking-wide text-ink-subtle">
            {popup.hourlyTitle}
          </span>
          <span className="text-[11px] text-ink-subtle">
            {interpolate(popup.nowReference, {
              time: interpolate(popup.hourTick, { hour: nowHour }),
            })}
          </span>
        </div>
        <div className="flex h-[62px] items-end gap-px px-px" aria-hidden="true">
          {detail.hourly.map((value, hour) => {
            const isNow = hour === nowHour;
            const heightPct = Math.max(
              4,
              Math.round((value / detail.maxHourly) * 100),
            );
            return (
              <div
                key={hour}
                className="flex-1 rounded-t-[2px]"
                style={{
                  height: `${heightPct}%`,
                  background: isNow ? color : bar,
                  boxShadow: isNow ? `0 0 0 1.5px ${color}` : undefined,
                }}
              />
            );
          })}
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] tabular-nums text-ink-subtle">
          {HOUR_TICKS.map((hour) => (
            <span key={hour}>{interpolate(popup.hourTick, { hour })}</span>
          ))}
        </div>

        <div className="my-3.5 h-px bg-line" />
        <div className="flex gap-2">
          <Stat
            value={interpolate(popup.floorsValue, { floors: detail.floors })}
            label={popup.scale}
          />
          <span className="w-px bg-line" aria-hidden="true" />
          <Stat
            value={`${formatNumber(locale, detail.grossFloorAreaM2)}㎡`}
            label={popup.area}
          />
          <span className="w-px bg-line" aria-hidden="true" />
          <Stat value={String(detail.completionYear)} label={popup.completion} />
        </div>

        <Link
          href={estateHref}
          className="mt-3.5 flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-line-strong bg-ink px-3 text-sm font-bold text-surface transition hover:bg-ink-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <span>{popup.openEstate}</span>
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 text-center">
      <div className="text-[15px] font-bold text-ink tabular-nums">{value}</div>
      <div className="mt-0.5 text-[11px] text-ink-subtle">{label}</div>
    </div>
  );
}
