export type PointEventReason =
  | { kind: "verified-savings" }
  | { kind: "mission"; code: string }
  | { kind: "goal"; id: string }
  | { kind: "other"; reason: string };

export function parsePointEventReason(reason: string): PointEventReason {
  if (reason === "verified-savings") return { kind: "verified-savings" };
  if (reason.startsWith("qr:")) return { kind: "mission", code: reason.slice(3) };
  if (reason.startsWith("goal:")) return { kind: "goal", id: reason.slice(5) };
  return { kind: "other", reason };
}
