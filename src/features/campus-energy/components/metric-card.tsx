type MetricCardProps = {
  label: string;
  value: string;
  tone?: "neutral" | "saving" | "overuse";
};

export function MetricCard({
  label,
  value,
  tone = "neutral",
}: MetricCardProps) {
  const toneClass = {
    neutral: "border-slate-200 bg-white text-slate-950",
    saving: "border-emerald-200 bg-emerald-50 text-emerald-950",
    overuse: "border-rose-200 bg-rose-50 text-rose-950",
  }[tone];

  return (
    <div className={`border p-4 ${toneClass}`}>
      <p className="text-xs font-medium uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
