import type { EnergyStatus } from "../domain/types";

// Fixed status accents shared by the 3D buildings, popup, rank panel, legend,
// and summary chips so the color semantics read identically across map and UI,
// independent of the light/dark theme. `bar` is the translucent fill used for
// non-current hourly bars.
export const STATUS_COLOR: Record<
  EnergyStatus,
  { base: string; soft: string; bar: string }
> = {
  saving: {
    base: "#10b981",
    soft: "rgba(16, 185, 129, 0.14)",
    bar: "rgba(16, 185, 129, 0.5)",
  },
  overuse: {
    base: "#f43f5e",
    soft: "rgba(244, 63, 94, 0.14)",
    bar: "rgba(244, 63, 94, 0.5)",
  },
  neutral: {
    base: "#94a3b8",
    soft: "rgba(148, 163, 184, 0.14)",
    bar: "rgba(148, 163, 184, 0.5)",
  },
};
