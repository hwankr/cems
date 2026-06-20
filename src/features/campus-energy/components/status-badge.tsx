import type { EnergyStatus } from "../domain/types";

export function StatusBadge({ status }: { status: EnergyStatus }) {
  const config = {
    saving: "bg-emerald-100 text-emerald-800",
    neutral: "bg-slate-100 text-slate-700",
    overuse: "bg-rose-100 text-rose-800",
  }[status];

  return (
    <span className={`px-2 py-1 text-xs font-semibold ${config}`}>
      {status}
    </span>
  );
}
