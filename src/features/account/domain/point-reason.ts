export type PointEventReason =
  | { kind: "verified-savings" }
  | { kind: "mission"; code: string }
  | { kind: "goal"; id: string }
  | { kind: "quiz" }
  | { kind: "other"; reason: string };

export function parsePointEventReason(reason: string): PointEventReason {
  if (reason === "verified-savings") return { kind: "verified-savings" };
  if (reason.startsWith("qr:")) return { kind: "mission", code: reason.slice(3) };
  if (reason.startsWith("goal:")) return { kind: "goal", id: reason.slice(5) };
  if (reason.startsWith("quiz:")) return { kind: "quiz" };
  return { kind: "other", reason };
}
