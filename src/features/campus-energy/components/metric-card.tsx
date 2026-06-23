import type { ReactNode } from "react";

type Tone = "neutral" | "saving" | "overuse" | "accent";

type MetricCardProps = {
  label: string;
  value: string;
  tone?: Tone;
  icon?: ReactNode;
  hint?: string;
};

const TONE: Record<Tone, { value: string; chip: string; bar: string }> = {
  neutral: {
    value: "text-ink",
    chip: "bg-surface-3 text-ink-muted",
    bar: "bg-line-strong",
  },
  saving: {
    value: "text-saving",
    chip: "bg-saving-soft text-saving",
    bar: "bg-saving",
  },
  overuse: {
    value: "text-overuse",
    chip: "bg-overuse-soft text-overuse",
    bar: "bg-overuse",
  },
  accent: {
    value: "text-accent",
    chip: "bg-accent-soft text-accent",
    bar: "bg-accent",
  },
};

export function MetricCard({
  label,
  value,
  tone = "neutral",
  icon,
  hint,
}: MetricCardProps) {
  const t = TONE[tone];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-card">
      <span
        className={`absolute inset-x-0 top-0 h-0.5 ${t.bar} opacity-70`}
        aria-hidden="true"
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-subtle">
          {label}
        </p>
        {icon ? (
          <span
            className={`grid h-7 w-7 place-items-center rounded-lg ${t.chip}`}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <p className={`mt-3 text-2xl font-semibold tabular-nums ${t.value}`}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-ink-subtle">{hint}</p> : null}
    </div>
  );
}
