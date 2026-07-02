import { parsePointEventReason } from "./point-reason";

export type PointEvent = {
  id: string;
  userId: string;
  points: number;
  reason: string;
  periodLabel: string;
  createdAt: string;
};

export function sumPersonalPoints(events: readonly PointEvent[]): number {
  return events.reduce((sum, current) => sum + Math.max(0, current.points), 0);
}

export function countMissionCheckIns(events: readonly PointEvent[]): number {
  return events.reduce(
    (count, event) =>
      parsePointEventReason(event.reason).kind === "mission" ? count + 1 : count,
    0,
  );
}
