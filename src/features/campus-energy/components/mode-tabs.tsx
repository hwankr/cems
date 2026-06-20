"use client";

type Mode = "admin" | "participant";

type ModeTabsProps = {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
};

export function ModeTabs({ mode, onModeChange }: ModeTabsProps) {
  return (
    <div className="inline-flex border border-slate-300 bg-white p-1">
      {[
        ["admin", "Admin Dashboard"],
        ["participant", "Participant Mode"],
      ].map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => onModeChange(value as Mode)}
          className={`px-3 py-2 text-sm font-medium ${
            mode === value
              ? "bg-slate-950 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
