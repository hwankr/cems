"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, BadgeCheck, Coins, Hammer, Leaf } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { formatKwh, formatPoints } from "@/i18n/format";
import type { EstatePageData } from "../data/get-estate-page-data";

type EstateGameClientProps = {
  data: EstatePageData;
};

type EstateMetricProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

export function EstateGameClient({ data }: EstateGameClientProps) {
  const { locale, messages } = useI18n();
  const savedEnergyValue = data.comparison
    ? formatKwh(locale, data.comparison.savingsKwh)
    : messages.estate.unavailable;
  const officialCode = data.subject.officialCode ?? data.subject.shortName;

  return (
    <main className="min-h-dvh bg-canvas px-4 py-5 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-6xl gap-5">
        <Link
          href={`/${locale}`}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold text-ink-muted shadow-card transition hover:border-accent hover:text-accent"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {messages.estate.backToMap}
        </Link>

        <section className="grid gap-4 rounded-2xl border border-line bg-surface p-5 shadow-card lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
              {messages.estate.title}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">
              {data.subject.name}
            </h1>
            <p className="mt-2 text-sm text-ink-muted">{data.school.name}</p>
          </div>

          <div className="grid content-start gap-2 rounded-xl border border-line bg-surface-3 p-4">
            <span className="inline-flex items-center gap-2 text-xs font-semibold text-ink-subtle">
              <BadgeCheck size={15} aria-hidden="true" />
              {messages.estate.officialCode}
            </span>
            <strong className="font-mono text-2xl text-ink">
              {officialCode}
            </strong>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <EstateMetric
            icon={<Leaf size={16} aria-hidden="true" />}
            label={messages.estate.savedEnergy}
            value={savedEnergyValue}
          />
          <EstateMetric
            icon={<Coins size={16} aria-hidden="true" />}
            label={messages.estate.earnedPoints}
            value={formatPoints(locale, data.pointAccount.earnedPoints)}
          />
          <EstateMetric
            icon={<Coins size={16} aria-hidden="true" />}
            label={messages.estate.spentPoints}
            value={formatPoints(locale, data.pointAccount.spentPoints)}
          />
          <EstateMetric
            icon={<Coins size={16} aria-hidden="true" />}
            label={messages.estate.availablePoints}
            value={formatPoints(locale, data.pointAccount.availablePoints)}
          />
        </section>

        <section className="grid min-h-[22rem] place-items-center rounded-2xl border border-dashed border-line-strong bg-surface p-6 text-center shadow-card">
          <div className="grid justify-items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-accent-soft text-accent">
              <Hammer size={22} aria-hidden="true" />
            </span>
            <p className="text-lg font-semibold text-ink">
              {messages.estate.enginePlaceholder}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function EstateMetric({ icon, label, value }: EstateMetricProps) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
          {label}
        </p>
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent-soft text-accent">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-ink">
        {value}
      </p>
    </div>
  );
}
